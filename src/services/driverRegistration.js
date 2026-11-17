import { supabase } from "../lib/supabase";

const STORAGE_BUCKET = "driver-documents";
const DRIVER_REGISTRATION_PENDING_CODE = "DRIVER_REGISTRATION_PENDING";
const DRIVER_REGISTRATION_PENDING_MESSAGE =
  "Ya existe un perfil asociado a este número de documento y está pendiente de validación.";
const IMAGE_FORMATS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function createPendingRegistrationError() {
  const error = new Error(DRIVER_REGISTRATION_PENDING_MESSAGE);
  error.code = DRIVER_REGISTRATION_PENDING_CODE;
  return error;
}

export function isDriverRegistrationPendingError(error) {
  return error?.code === DRIVER_REGISTRATION_PENDING_CODE;
}

export async function getDriverVerificationStatus() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!sessionData.session?.user) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "get_driver_verification_status"
  );

  if (error) {
    if (error.code === "PGRST202") {
      throw new Error(
        "Supabase aún no tiene la función para consultar la aprobación del conductor. Aplica la migración 20261111020000_driver_verification_status.sql."
      );
    }

    throw error;
  }

  if (data !== null && typeof data !== "boolean") {
    throw new Error("Supabase devolvió un estado de aprobación no válido.");
  }

  return data;
}

function dateFromDatabase(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getSignedPhoto(bucket, path) {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    throw error;
  }

  return { uri: data.signedUrl, storagePath: path };
}

export async function getDriverRegistration() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!sessionData.session?.user) {
    throw new Error("No hay una sesión activa para editar la solicitud.");
  }

  const { data, error } = await supabase.rpc("get_driver_registration");

  if (error) {
    if (error.code === "PGRST202") {
      throw new Error(
        "Supabase aún no tiene la función para cargar la solicitud de registro. Aplica la migración 20261111030000_edit_driver_registration.sql."
      );
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  const [profilePhoto, vehiclePhoto, licensePhoto, insurancePhoto, inspectionPhoto] =
    await Promise.all([
      getSignedPhoto(STORAGE_BUCKET, data.driver.profile_photo_path),
      getSignedPhoto(STORAGE_BUCKET, data.vehicle.photo_path),
      getSignedPhoto(STORAGE_BUCKET, data.documents.license_photo_path),
      getSignedPhoto(STORAGE_BUCKET, data.documents.insurance_photo_path),
      getSignedPhoto(
        STORAGE_BUCKET,
        data.documents.technical_inspection_photo_path
      ),
    ]);

  return {
    driver: {
      identificationNumber: data.driver.document_number,
      fullName: data.driver.full_name,
      phone: data.driver.phone_number,
      birthDate: dateFromDatabase(data.driver.birth_date),
      gender: data.driver.gender,
      email: data.driver.email,
      language: data.driver.language,
      profilePhoto,
    },
    vehicle: {
      category: data.vehicle.category,
      plate: data.vehicle.license_plate,
      make: data.vehicle.brand,
      model: data.vehicle.model,
      year: String(data.vehicle.year ?? ""),
      color: data.vehicle.color,
      passengerCapacity: String(data.vehicle.passenger_capacity ?? ""),
      photo: vehiclePhoto,
    },
    documents: {
      licenseNumber: data.documents.license_number,
      licensePhoto,
      licenseExpiration: dateFromDatabase(
        data.documents.license_expiration_date
      ),
      soatPhoto: insurancePhoto,
      soatExpiration: dateFromDatabase(
        data.documents.insurance_expiration_date
      ),
      technicalInspectionPhoto: inspectionPhoto,
      technicalInspectionExpiration: dateFromDatabase(
        data.documents.technical_inspection_expiration_date
      ),
      mercadoPagoEmail: data.documents.mercado_pago_email,
      termsAccepted: true,
    },
  };
}

function toDatabaseDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function ensureAuthenticatedUser() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session?.user) {
    return sessionData.session.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(
      `No se pudo iniciar una sesión anónima. Habilita Anonymous Sign-Ins en Supabase Auth. ${error.message}`
    );
  }

  if (!data.user || !data.session) {
    throw new Error("Supabase no devolvió una sesión autenticada.");
  }

  return data.user;
}

function getImageContentType(image) {
  const uriExtension = image.uri
    ?.split(/[?#]/, 1)[0]
    .split(".")
    .pop()
    .toLowerCase();
  const inferredContentType =
    uriExtension === "png"
      ? "image/png"
      : uriExtension === "webp"
        ? "image/webp"
        : "image/jpeg";
  const contentType = image.mimeType?.toLowerCase() || inferredContentType;

  if (!IMAGE_FORMATS[contentType]) {
    throw new Error(
      "Formato de imagen no compatible. Usa una foto JPEG, PNG o WebP."
    );
  }

  return contentType;
}

async function uploadImage(userId, image, name) {
  if (!image?.uri) {
    return null;
  }

  const contentType = getImageContentType(image);
  const extension = IMAGE_FORMATS[contentType];
  const uniqueId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const path = `${userId}/${name}-${uniqueId}.${extension}`;
  const response = await fetch(image.uri);
  const file = await response.arrayBuffer();

  if (file.byteLength === 0) {
    throw new Error(`La imagen "${name}" está vacía.`);
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType, upsert: false });

  if (error) {
    throw error;
  }

  return path;
}

async function removeUploadedImages(paths) {
  if (paths.length === 0) {
    return;
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(paths);

  if (error) {
    console.error("No se pudieron eliminar las fotos de Storage.", error);
  }
}

export async function saveDriverRegistration({
  driver,
  vehicle,
  documents,
  isEditing = false,
}) {
  const user = await ensureAuthenticatedUser();
  const documentNumber = driver.identificationNumber.trim();

  if (!isEditing) {
    const { data: registrationExists, error: lookupError } = await supabase.rpc(
      "driver_registration_exists",
      { p_document_number: documentNumber }
    );

    if (lookupError) {
      if (lookupError.code === "PGRST202") {
        throw new Error(
          "Supabase aún no tiene la función de verificación de conductores. Aplica la migración 20261111010000_driver_registration_duplicate_check.sql y vuelve a intentar."
        );
      }

      throw lookupError;
    }

    if (registrationExists) {
      throw createPendingRegistrationError();
    }
  }

  const uploadedPaths = [];
  const upload = async (image, name) => {
    if (image?.storagePath) {
      return image.storagePath;
    }

    const path = await uploadImage(user.id, image, name);
    if (path) {
      uploadedPaths.push(path);
    }
    return path;
  };

  const previousPaths = [
    driver.profilePhoto?.storagePath || driver.profilePhoto?.replacedStoragePath,
    vehicle.photo?.storagePath || vehicle.photo?.replacedStoragePath,
    documents.licensePhoto?.storagePath ||
      documents.licensePhoto?.replacedStoragePath,
    documents.soatPhoto?.storagePath || documents.soatPhoto?.replacedStoragePath,
    documents.technicalInspectionPhoto?.storagePath ||
      documents.technicalInspectionPhoto?.replacedStoragePath,
  ].filter(Boolean);
  let savedPaths = [];

  try {
    const profilePhotoPath = await upload(driver.profilePhoto, "profile");
    const vehiclePhotoPath = await upload(vehicle.photo, "vehicle");
    const licensePhotoPath = await upload(documents.licensePhoto, "license");
    const insurancePhotoPath = await upload(documents.soatPhoto, "insurance");
    const inspectionPhotoPath = await upload(
      documents.technicalInspectionPhoto,
      "technical-inspection"
    );

    const registration = {
      p_driver: {
        document_number: documentNumber,
        full_name: driver.fullName.trim(),
        phone_number: driver.phone.trim(),
        birth_date: toDatabaseDate(driver.birthDate),
        gender: driver.gender,
        email: driver.email.trim().toLowerCase(),
        language: driver.language,
        profile_photo_path: profilePhotoPath,
      },
      p_vehicle: {
        category: vehicle.category,
        license_plate: vehicle.plate.trim().toUpperCase(),
        brand: vehicle.make.trim(),
        model: vehicle.model.trim(),
        year: Number(vehicle.year),
        color: vehicle.color,
        passenger_capacity: Number(vehicle.passengerCapacity),
        photo_path: vehiclePhotoPath,
      },
      p_documents: {
        license_number: documents.licenseNumber.trim(),
        license_photo_path: licensePhotoPath,
        license_expiration_date: toDatabaseDate(documents.licenseExpiration),
        insurance_photo_path: insurancePhotoPath,
        insurance_expiration_date: toDatabaseDate(documents.soatExpiration),
        technical_inspection_photo_path: inspectionPhotoPath,
        technical_inspection_expiration_date: toDatabaseDate(
          documents.technicalInspectionExpiration
        ),
        mercado_pago_email: documents.mercadoPagoEmail.trim().toLowerCase(),
      },
    };
    const { error } = await supabase.rpc(
      isEditing
        ? "update_driver_registration"
        : "create_driver_registration",
      registration
    );

    if (error) {
      if (isEditing && error.code === "PGRST202") {
        throw new Error(
          "Supabase aún no tiene la función para actualizar la solicitud. Aplica la migración 20261111030000_edit_driver_registration.sql."
        );
      }

      throw error;
    }

    savedPaths = [
      profilePhotoPath,
      vehiclePhotoPath,
      licensePhotoPath,
      insurancePhotoPath,
      inspectionPhotoPath,
    ].filter(Boolean);
  } catch (error) {
    await removeUploadedImages(uploadedPaths);
    if (
      error.code === "P0001" &&
      error.message === DRIVER_REGISTRATION_PENDING_CODE
    ) {
      throw createPendingRegistrationError();
    }
    throw error;
  }

  const obsoletePaths = previousPaths.filter(
    (path) => !savedPaths.includes(path)
  );
  await removeUploadedImages(obsoletePaths);
}
