import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Container,
  Paper,
  Title,
  Stack,
  Anchor,
  Center,
} from "@mantine/core";
import { signInWithEmail, signUpWithEmail } from "../firebaseClient";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { PATHS } from "../constants/MyClasses.ts";

function Login() {
  const { user } = useAuth();
  const { t } = useTranslation("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("signin"); // 'signin' or 'signup'
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const parseFirebaseError = (err) => {
    if (!err) return { message: "Unknown error", code: undefined };
    const raw = err.message || String(err);
    // If message contains code prefix like 'auth/invalid-password: ...'
    const parts = raw.split(":");
    if (parts.length >= 2 && parts[0].startsWith("auth/")) {
      const code = parts[0].trim();
      const rest = parts.slice(1).join(":").trim();
      // Map a few common codes to friendly messages
      const map = {
        "auth/invalid-email": t('login.invalidEmail'),
        "auth/user-disabled": t('login.userDisabled'),
        "auth/user-not-found": t('login.userNotFound'),
        "auth/wrong-password": t('login.wrongPassword'),
        "auth/email-already-in-use": t('login.emailAlreadyInUse'),
        "auth/weak-password": t('login.weakPassword'),
        "auth/invalid-api-key": t('login.invalidApiKey'),
      };
      return { message: map[code] || rest || raw, code };
    }
    return { message: raw, code: undefined };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "signin") {
      await handleEmailSignIn();
    } else {
      await handleEmailSignUp();
    }
  };

  return (
    <Container size="xs" mt="xl">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title ta="center">{t("title")}</Title>
            <TextInput
              name="email"
              label={t("email")}
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              name="password"
              label={t("password")}
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div style={{ color: "red" }}>{String(error)}</div>}

            {mode === "signup" && (
              <PasswordInput
                name="confirmPassword"
                label={t("confirm_password")}
                placeholder={t("confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            )}

            <Center>
              <Button type="submit" loading={loading}>
                {mode === "signin" ? t("sign_in") : t("sign_up")}
              </Button>
            </Center>

            <div style={{ textAlign: "center" }}>
              {mode === "signin" ? (
                <Anchor
                  component="button"
                  size="sm"
                  onClick={() => setMode("signup")}
                >
                  {t("dont_have_account")}
                </Anchor>
              ) : (
                <Anchor
                  component="button"
                  size="sm"
                  onClick={() => setMode("signin")}
                >
                  {t("already_have_account")}
                </Anchor>
              )}
            </div>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

export default Login;
