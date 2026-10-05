import { AppError } from "../utils/AppError.js";

// -- Tiny, zero-dependency input validators ------------------------------------

const emailRegex = /^\S+@\S+\.\S+$/;

export const validateRegister = (req, _res, next) => {
  const { name, email, password, role } = req.body;
  const errors = [];

  if (!name  || name.trim().length < 2)   errors.push("Name must be at least 2 characters.");
  if (!email || !emailRegex.test(email))  errors.push("A valid email is required.");
  if (!password || password.length < 8)   errors.push("Password must be at least 8 characters.");
  if (role && !["student","alumni"].includes(role)) errors.push("Role must be 'student' or 'alumni'.");

  if (errors.length) return next(new AppError(errors.join(" "), 422));
  next();
};

export const validateLogin = (req, _res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !emailRegex.test(email)) errors.push("A valid email is required.");
  if (!password)                         errors.push("Password is required.");

  if (errors.length) return next(new AppError(errors.join(" "), 422));
  next();
};
