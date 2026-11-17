import { supabase } from "../lib/supabase";

const STORAGE_BUCKET = "driver-documents";
const IMAGE_FORMATS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function createTestTripRequest(driverLocation, paymentMethod = "cash") {
  if (
    !Number.isFinite(driverLocation?.latitude) ||
    !Number.isFinite(driverLocation?.longitude)
  ) {
    throw new Error("Se necesita una ubicación válida para crear el viaje de prueba.");
  }
  if (!["cash", "mercado_pago"].includes(paymentMethod)) {
    throw new Error("El método de pago de prueba no es válido.");
  }

  const originLatitude = driverLocation.latitude + 0.002;
  const originLongitude = driverLocation.longitude + 0.002;
  const destinationLatitude = originLatitude + 0.008;
  const destinationLongitude = originLongitude + 0.006;
  const estimatedFare = 10000;
  const commissionRate = 0.25;
  const estimatedCommission = estimatedFare * commissionRate;

  const { data, error } = await supabase.rpc("request_trip", {
    p_trip: {
      origin_label: "PRUEBA - Punto de recogida",
      origin_latitude: originLatitude,
      origin_longitude: originLongitude,
      destination_label: "PRUEBA - Punto de destino",
      destination_latitude: destinationLatitude,
      destination_longitude: destinationLongitude,
      distance_km: 2,
      duration_minutes: 10,
      category: "economy",
      payment_method: paymentMethod,
      estimated_fare: estimatedFare,
      estimated_commission: estimatedCommission,
      estimated_driver_net: estimatedFare - estimatedCommission,
      commission_rate: commissionRate,
    },
  });
  if (error) {
    throw error;
  }
  if (typeof data !== "string" || !data) {
    throw new Error("Supabase no devolvió el identificador de la solicitud de prueba.");
  }
  return data;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function getPaymentStatusLabel(status) {
  return {
    approved: "Aprobado",
    pending: "Pendiente",
    rejected: "Rechazado",
    cash: "Efectivo",
  }[status] || "Pendiente";
}

export async function advanceTrip(tripId, status) {
  const { data, error } = await supabase.rpc("driver_advance_trip", {
    p_trip_id: tripId,
    p_next_status: status,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function cancelTrip(tripId) {
  const { error } = await supabase.rpc("driver_cancel_trip", {
    p_trip_id: tripId,
  });
  if (error) {
    throw error;
  }
}

async function createSignedPhotoUrl(path) {
  if (!path) {
    return null;
  }
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) {
    throw error;
  }
  return { path, uri: data.signedUrl };
}

export async function getDriverProfile() {
  const { data, error } = await supabase.rpc("driver_get_profile");
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("No se encontró el perfil aprobado del conductor.");
  }

  const documents = data.documents;
  const [profilePhoto, vehiclePhoto, licensePhoto, insurancePhoto, inspectionPhoto] =
    await Promise.all([
    createSignedPhotoUrl(data.driver.profile_photo_path),
    createSignedPhotoUrl(data.vehicle.photo_path),
    createSignedPhotoUrl(documents.license_photo_path),
    createSignedPhotoUrl(documents.insurance_photo_path),
    createSignedPhotoUrl(documents.technical_inspection_photo_path),
  ]);
  return {
    driver: { ...data.driver, profile_photo: profilePhoto },
    vehicle: { ...data.vehicle, photo: vehiclePhoto },
    documents: {
      ...documents,
      license_photo: licensePhoto,
      insurance_photo: insurancePhoto,
      technical_inspection_photo: inspectionPhoto,
    },
  };
}

export async function getDriverMenuProfile() {
  const { data, error } = await supabase.rpc("driver_get_profile");
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("No se encontró el perfil aprobado del conductor.");
  }

  return {
    fullName: data.driver.full_name,
    profilePhoto: await createSignedPhotoUrl(data.driver.profile_photo_path),
  };
}

async function uploadDocument(userId, image, name) {
  if (!image?.uri) {
    return null;
  }
  const uriExtension = image.uri.split(/[?#]/, 1)[0].split(".").pop().toLowerCase();
  const inferredType =
    uriExtension === "png"
      ? "image/png"
      : uriExtension === "webp"
        ? "image/webp"
        : "image/jpeg";
  const contentType = image.mimeType?.toLowerCase() || inferredType;
  const extension = IMAGE_FORMATS[contentType];
  if (!extension) {
    throw new Error("Formato no compatible. Usa una imagen JPEG, PNG o WebP.");
  }
  const path = `${userId}/${name}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;
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

export async function updateDriverProfile(profile) {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (!sessionData.session?.user) {
    throw new Error("No hay una sesión activa para actualizar el perfil.");
  }

  const replacedPaths = [];
  const uploadedPaths = [];
  const replacePhoto = async (photo, name) => {
    if (photo?.path && photo?.uri?.startsWith("http")) {
      return photo.path;
    }
    if (!photo?.uri) {
      return null;
    }
    const newPath = await uploadDocument(sessionData.session.user.id, photo, name);
    uploadedPaths.push(newPath);
    if (photo.replacedPath) {
      replacedPaths.push(photo.replacedPath);
    }
    return newPath;
  };

  try {
    const profilePhotoPath = await replacePhoto(
      profile.driver.profile_photo,
      "profile"
    );
    const vehiclePhotoPath = await replacePhoto(
      profile.vehicle.photo,
      "vehicle"
    );
    const licensePhotoPath = await replacePhoto(profile.documents.license_photo, "license");
    const insurancePhotoPath = await replacePhoto(
      profile.documents.insurance_photo,
      "insurance"
    );
    const inspectionPhotoPath = await replacePhoto(
      profile.documents.technical_inspection_photo,
      "technical-inspection"
    );
    const { error } = await supabase.rpc("driver_update_profile", {
      p_driver: {
        full_name: profile.driver.full_name.trim(),
        phone_number: profile.driver.phone_number.trim(),
        birth_date: profile.driver.birth_date || null,
        gender: profile.driver.gender,
        email: profile.driver.email.trim().toLowerCase(),
        language: profile.driver.language,
        profile_photo_path: profilePhotoPath,
      },
      p_vehicle: {
        category: profile.vehicle.category.trim(),
        license_plate: profile.vehicle.license_plate.trim().toUpperCase(),
        brand: profile.vehicle.brand.trim(),
        model: profile.vehicle.model.trim(),
        year: profile.vehicle.year,
        color: profile.vehicle.color.trim(),
        passenger_capacity: profile.vehicle.passenger_capacity,
        photo_path: vehiclePhotoPath,
      },
      p_documents: {
        license_expiration_date: profile.documents.license_expiration_date || null,
        insurance_expiration_date:
          profile.documents.insurance_expiration_date || null,
        technical_inspection_expiration_date:
          profile.documents.technical_inspection_expiration_date || null,
        mercado_pago_email: String(
          profile.documents.mercado_pago_email || ""
        )
          .trim()
          .toLowerCase(),
        license_photo_path: licensePhotoPath,
        insurance_photo_path: insurancePhotoPath,
        technical_inspection_photo_path: inspectionPhotoPath,
      },
    });
    if (error) {
      throw error;
    }

    const obsoletePaths = replacedPaths.filter(
      (path) => !uploadedPaths.includes(path)
    );
    if (obsoletePaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(obsoletePaths);
      if (removeError) {
        console.error("No se pudieron eliminar las fotos reemplazadas.", removeError);
      }
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(uploadedPaths);
      if (removeError) {
        console.error("No se pudieron limpiar las fotos cargadas.", removeError);
      }
    }
    throw error;
  }
}

export async function signOutDriver() {
  let pushCleanupError;
  try {
    const messaging = await import(
      "@react-native-firebase/messaging"
    );
    const token = await messaging.getToken(messaging.getMessaging());
    if (token) {
      const { error: removeError } = await supabase.rpc(
        "driver_remove_push_token",
        { p_token: token }
      );
      if (removeError) {
        throw removeError;
      }
    }
  } catch (error) {
    pushCleanupError = error;
    console.error("No se pudo retirar el token push antes del cierre de sesión.", error);
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  return pushCleanupError?.message || null;
}
