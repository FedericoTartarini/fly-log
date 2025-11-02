import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Group,
  Container,
  Paper,
  Title,
  Stack,
  Anchor,
} from "@mantine/core";
import { IconBrandGoogle } from "@tabler/icons-react";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "../firebaseClient";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { PATHS } from "../constants/MyClasses.ts";

function Login() {
  const { session } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("signin"); // 'signin' or 'signup'
  const [confirmPassword, setConfirmPassword] = useState("");

  if (session) return <Navigate to={PATHS.STATS} />;

  const handleEmailSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (e) {
      console.error("signInWithEmail failed:", e);
      // Normalize Firebase style errors like 'auth/invalid-email: The email address is badly formatted.'
      const msg = parseFirebaseError(e);
      // In dev show the full code too for easier debugging
      const code = e?.code || e?._tokenResponse?.error?.message || "";
      const isDev =
        typeof process !== "undefined"
          ? process.env?.NODE_ENV === "development"
          : false;
      setError(isDev && code ? `${msg} (${code})` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      await signUpWithEmail(email, password);
    } catch (e) {
      console.error("signUpWithEmail failed:", e);
      const msg = parseFirebaseError(e);
      const code = e?.code || e?._tokenResponse?.error?.message || "";
      const isDev2 =
        typeof process !== "undefined"
          ? process.env?.NODE_ENV === "development"
          : false;
      setError(isDev2 && code ? `${msg} (${code})` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const parseFirebaseError = (err) => {
    if (!err) return "Unknown error";
    const raw = err.message || String(err);
    // If message contains code prefix like 'auth/invalid-password: ...'
    const parts = raw.split(":");
    if (parts.length >= 2 && parts[0].startsWith("auth/")) {
      const code = parts[0].trim();
      const rest = parts.slice(1).join(":").trim();
      // Map a few common codes to friendly messages
      const map = {
        "auth/invalid-email": "The email address is badly formatted.",
        "auth/user-disabled": "This user account has been disabled.",
        "auth/user-not-found": "No user found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/email-already-in-use": "This email is already in use.",
        "auth/weak-password": "Password is too weak.",
        "auth/invalid-api-key":
          "Invalid Firebase API key (check your VITE_FIREBASE_API_KEY).",
      };
      return map[code] || rest || raw;
    }
    return raw;
  };

  return (
    <Container size="xs" mt="xl">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
          <Title ta="center">{t("login.title")}</Title>
          <TextInput
            label={t("login.email")}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordInput
            label={t("login.password")}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div style={{ color: "red" }}>{String(error)}</div>}

          {mode === "signup" && (
            <PasswordInput
              label={t("login.confirm_password")}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          <Group position="apart">
            <Button
              onClick={
                mode === "signin" ? handleEmailSignIn : handleEmailSignUp
              }
              loading={loading}
            >
              {mode === "signin" ? t("login.sign_in") : t("login.sign_up")}
            </Button>

            <Button
              color="gray"
              leftIcon={<IconBrandGoogle />}
              onClick={handleGoogle}
              loading={loading}
            >
              {mode === "signin"
                ? t("login.sign_in_google")
                : t("login.sign_up_google")}
            </Button>
          </Group>

          <div style={{ marginTop: 8, textAlign: "center" }}>
            {mode === "signin" ? (
              <Anchor
                component="button"
                size="sm"
                onClick={() => setMode("signup")}
              >
                {t("login.dont_have_account")}
              </Anchor>
            ) : (
              <Anchor
                component="button"
                size="sm"
                onClick={() => setMode("signin")}
              >
                {t("login.already_have_account")}
              </Anchor>
            )}
          </div>
        </Stack>
      </Paper>
    </Container>
  );
}

export default Login;
