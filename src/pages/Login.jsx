import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Container,
  Title,
  Text,
  Stack,
  Anchor,
} from "@mantine/core";
import { IconBrandGoogle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  auth,
} from "../firebaseClient";
import { sendPasswordResetEmail } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { PATHS } from "../constants/MyClasses.ts";
import classes from "./Login.module.css";

// Sign-in page, drawn as a boarding pass: Google first, then email and
// password. The stub switches between signing in and creating an account.
function Login() {
  const { user } = useAuth();
  const { t } = useTranslation("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("signin"); // 'signin' or 'signup'
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to={PATHS.STATS} />;

  const handleEmailSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (e) {
      console.error("signInWithEmail failed:", e);
      // Normalize Firebase style errors like 'auth/invalid-email: The email address is badly formatted.'
      const { message, code } = parseFirebaseError(e);
      // In dev show the full code too for easier debugging
      const isDev =
        typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.DEV;
      setError(isDev && code ? `${message} (${code})` : message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      if (password !== confirmPassword) {
        setError(t("passwordsDoNotMatch"));
        setLoading(false);
        return;
      }
      await signUpWithEmail(email, password);
    } catch (e) {
      console.error("signUpWithEmail failed:", e);
      const { message, code } = parseFirebaseError(e);
      const isDev2 =
        typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.DEV;
      setError(isDev2 && code ? `${message} (${code})` : message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError(t("enterEmailForReset"));
      return;
    }
    if (!auth) {
      setError("Firebase not initialized");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      notifications.show({
        title: t("resetEmailSent"),
        message: t("checkYourEmailForInstructions"),
        color: "green",
      });
    } catch (e) {
      const { message } = parseFirebaseError(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const parseFirebaseError = (err) => {
    if (!err) return { message: "Unknown error", code: undefined };
    const raw = err.message || String(err);
    // The SDK puts the code on err.code; it only appears in the message as
    // "Firebase: Error (auth/invalid-email)." which the split below never
    // matched, so every error fell through to the raw string.
    const parts = raw.split(":");
    const code =
      err.code ||
      (parts.length >= 2 && parts[0].startsWith("auth/")
        ? parts[0].trim()
        : undefined);
    if (code) {
      const rest = parts.slice(1).join(":").trim();
      // Map a few common codes to friendly messages
      const map = {
        "auth/invalid-email": t("invalidEmail"),
        "auth/user-disabled": t("userDisabled"),
        "auth/user-not-found": t("userNotFound"),
        "auth/wrong-password": t("wrongPassword"),
        "auth/email-already-in-use": t("emailAlreadyInUse"),
        "auth/weak-password": t("weakPassword"),
        "auth/invalid-api-key": t("invalidApiKey"),
        "auth/invalid-credential": t("invalidCredentials"),
        "auth/account-exists-with-different-credential": t(
          "accountExistsWithPassword",
        ),
        "auth/popup-blocked": t("popupBlocked"),
      };
      return { message: map[code] || rest || raw, code };
    }
    return { message: raw, code: undefined };
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      // Closing the popup, or opening a second one, is a normal thing to do
      // rather than an error worth shouting about.
      const dismissed = [
        "auth/popup-closed-by-user",
        "auth/cancelled-popup-request",
        "auth/user-cancelled",
      ];
      if (dismissed.includes(e?.code)) return;
      console.error("signInWithGoogle failed:", e);
      const { message } = parseFirebaseError(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "signin") {
      await handleEmailSignIn();
    } else {
      await handleEmailSignUp();
    }
  };

  const signingUp = mode === "signup";
  const switchMode = () => {
    setMode(signingUp ? "signin" : "signup");
    setError(null);
  };
  // One switch shows both password fields, so they can be compared.
  const passwordProps = {
    visible: showPassword,
    onVisibilityChange: setShowPassword,
    classNames: { input: classes.input },
    visibilityToggleButtonProps: {
      "aria-label": t("show_password"),
      "aria-pressed": showPassword,
      // Mantine leaves the toggle out of the tab order unless told otherwise.
      tabIndex: 0,
    },
  };

  return (
    <Container size="xs" mt="md" pb="xl">
      <Stack gap={20}>
        <div>
          <Title order={1} fz={30}>
            {t(signingUp ? "title_signup" : "title")}
          </Title>
          <Text c="var(--fl-muted)" mt={4}>
            {t(signingUp ? "subtitle_signup" : "subtitle")}
          </Text>
        </div>

        <form
          onSubmit={handleSubmit}
          className={classes.card}
          aria-labelledby="login-band"
        >
          <div className={classes.band}>
            <span id="login-band">
              {t(signingUp ? "band_signup" : "band_signin")}
            </span>
            <span aria-hidden="true">FlyLog</span>
          </div>

          <div className={classes.body}>
            <Button
              type="button"
              variant="default"
              size="lg"
              fz={16}
              leftSection={<IconBrandGoogle size={18} aria-hidden />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              data-cy="login-google"
            >
              {t("continue_with_google")}
            </Button>

            <div className={classes.or} aria-hidden="true">
              {t("or_email")}
            </div>

            <TextInput
              name="email"
              type="email"
              autoComplete="email"
              label={t("email")}
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              withAsterisk={false}
              classNames={{ input: classes.input }}
              data-cy="login-email"
            />
            <PasswordInput
              name="password"
              autoComplete={signingUp ? "new-password" : "current-password"}
              label={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              withAsterisk={false}
              data-cy="login-password"
              {...passwordProps}
            />
            {signingUp ? (
              <PasswordInput
                name="confirmPassword"
                autoComplete="new-password"
                label={t("confirm_password")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                withAsterisk={false}
                data-cy="login-confirm-password"
                {...passwordProps}
              />
            ) : (
              <Anchor
                component="button"
                type="button"
                size="sm"
                fw={500}
                underline="always"
                className={classes.forgot}
                onClick={handleForgotPassword}
                disabled={loading}
                data-cy="login-forgot-password"
              >
                {t("forgotPassword")}
              </Anchor>
            )}

            {error && (
              <p className={classes.error} role="alert" data-cy="login-error">
                {String(error)}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              radius={10}
              loading={loading}
              data-cy="login-submit"
            >
              {t(signingUp ? "sign_up" : "sign_in")}
            </Button>
          </div>

          <div className={classes.stub}>
            <Text fz={15}>{t(signingUp ? "have_account" : "new_here")}</Text>
            <Button
              type="button"
              variant="default"
              radius="xl"
              h={44}
              onClick={switchMode}
              data-cy={signingUp ? "login-to-signin" : "login-to-signup"}
            >
              {t(signingUp ? "sign_in" : "sign_up")}
            </Button>
          </div>
        </form>
      </Stack>
    </Container>
  );
}

export default Login;
