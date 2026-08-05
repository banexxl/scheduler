export type AuthActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};
