const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const driverNamePattern = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;
const TECHNICAL_INSPECTION_AGE_YEARS = 5;

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isAfterToday(value) {
  if (!isValidDate(value)) {
    return false;
  }

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

function isAtLeastEighteen(birthDate) {
  if (!isValidDate(birthDate)) {
    return false;
  }

  const eighteenthBirthday = new Date(birthDate);
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);
  return eighteenthBirthday <= new Date();
}

export function getEighteenthBirthdayLimit() {
  const latestBirthDate = new Date();
  latestBirthDate.setFullYear(latestBirthDate.getFullYear() - 18);
  return latestBirthDate;
}

export function hasValidVehicleYear(vehicleYear) {
  const year = String(vehicleYear ?? "");
  const maximumYear = new Date().getFullYear() + 1;

  return /^\d{4}$/.test(year) && Number(year) <= maximumYear;
}

export function requiresTechnicalInspection(vehicleYear) {
  if (!hasValidVehicleYear(vehicleYear)) {
    return false;
  }

  return (
    Number(vehicleYear) <=
    new Date().getFullYear() - TECHNICAL_INSPECTION_AGE_YEARS
  );
}

export function validateDriverInfo(driver) {
  const errors = {};
  const fullName = (driver.fullName || "").trim();
  const identityNumber = driver.identificationNumber || "";
  const phone = driver.phone || "";
  const email = (driver.email || "").trim();

  if (!driver.profilePhoto?.uri) {
    errors.profilePhoto = "No se agregó foto de perfil o se utilizó la imagen de ejemplo -_-";
  }

  if (!fullName) {
    errors.fullName = "Ingresa tu nombre completo.";
  } else if (fullName.length > 50 || !driverNamePattern.test(fullName)) {
    errors.fullName = "Usa solo letras y espacios (máximo 50 caracteres).";
  }

  if (!/^\d{6,10}$/.test(identityNumber)) {
    errors.identificationNumber = "Ingresa entre 6 y 10 dígitos.";
  }

  if (!/^\d{10}$/.test(phone)) {
    errors.phone = "Ingresa un número de celular de 10 dígitos.";
  }

  if (!isAtLeastEighteen(driver.birthDate)) {
    errors.birthDate = "Debes tener al menos 18 años.";
  }

  if (!driver.gender) {
    errors.gender = "Selecciona tu género.";
  }

  if (!emailPattern.test(email)) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!driver.language) {
    errors.language = "Selecciona un idioma.";
  }

  return errors;
}

export function validateDriverVehicle(vehicle) {
  const errors = {};
  const year = vehicle.year || "";
  const plate = (vehicle.plate || "").toUpperCase();
  const capacity = vehicle.passengerCapacity || "";
  const numericCapacity = Number(capacity);

  if (!vehicle.category) {
    errors.category = "Selecciona una categoría.";
  }

  if (!/^[A-Z]{3}\d{3}$/.test(plate)) {
    errors.plate = "Ingresa una placa colombiana válida, por ejemplo ABC123.";
  }

  if (!vehicle.make?.trim()) {
    errors.make = "Ingresa la marca del vehículo.";
  } else if (vehicle.make.length > 30) {
    errors.make = "La marca admite máximo 30 caracteres.";
  }

  if (!vehicle.model?.trim()) {
    errors.model = "Ingresa el modelo del vehículo.";
  } else if (vehicle.model.length > 30) {
    errors.model = "El modelo admite máximo 30 caracteres.";
  }

  if (!hasValidVehicleYear(year)) {
    const maximumYear = new Date().getFullYear() + 1;
    errors.year = `El año ingresado no es una fecha válida. Ingresa un año de 4 dígitos que no supere ${maximumYear}.`;
  }

  if (!vehicle.color) {
    errors.color = "Selecciona el color del vehículo.";
  }

  if (!/^\d+$/.test(capacity) || numericCapacity < 1) {
    errors.passengerCapacity = "Ingresa una capacidad válida.";
  } else if (vehicle.category === "xl" && numericCapacity < 6) {
    errors.passengerCapacity = "La categoría XL requiere mínimo 6 pasajeros.";
  }

  if (!vehicle.photo?.uri) {
    errors.photo = "Agrega una foto del vehículo donde se vea la placa.";
  }

  return errors;
}

export function validateDriverDocuments(documents, vehicle, driver) {
  const errors = {};
  const mercadoPagoEmail = (documents.mercadoPagoEmail || "").trim();
  const identityNumber = (driver.identificationNumber || "").trim();
  const licenseNumber = (documents.licenseNumber || "").trim();
  const isTechnicalInspectionRequired = requiresTechnicalInspection(
    vehicle.year
  );

  if (!/^\d{6,10}$/.test(licenseNumber)) {
    errors.licenseNumber = "Ingresa un número de licencia válido.";
  } else if (licenseNumber !== identityNumber) {
    errors.licenseNumber =
      "El número de licencia debe coincidir con el número de cédula.";
  }

  if (!documents.licensePhoto?.uri) {
    errors.licensePhoto = "Agrega una foto de tu licencia de conducción.";
  }

  if (!isAfterToday(documents.licenseExpiration)) {
    errors.licenseExpiration =
      "La fecha de vencimiento debe ser posterior a hoy.";
  }

  if (!documents.soatPhoto?.uri) {
    errors.soatPhoto = "Agrega una foto del SOAT.";
  }

  if (!isAfterToday(documents.soatExpiration)) {
    errors.soatExpiration = "La fecha de vencimiento debe ser posterior a hoy.";
  }

  if (isTechnicalInspectionRequired) {
    if (!documents.technicalInspectionPhoto?.uri) {
      errors.technicalInspectionPhoto =
        "Agrega una foto de la revisión técnico-mecánica.";
    }

    if (!isAfterToday(documents.technicalInspectionExpiration)) {
      errors.technicalInspectionExpiration =
        "La fecha de vencimiento debe ser posterior a hoy.";
    }
  }

  if (!emailPattern.test(mercadoPagoEmail)) {
    errors.mercadoPagoEmail = "Ingresa un correo electrónico válido.";
  }

  if (!documents.termsAccepted) {
    errors.termsAccepted = "Debes aceptar los términos y condiciones.";
  }

  return errors;
}