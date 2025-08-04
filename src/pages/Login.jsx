import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabaseClient } from "../supabaseClient";
import { Container, Title, Paper } from "@mantine/core";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Paths } from "../constants/MyClasses.js";

function Login() {
  const { session } = useAuth();

  if (session) {
    return <Navigate to={Paths.STATS} />;
  }

  return (
    <Container size="xs" mt="xl">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title ta="center" mb="lg">
          Welcome Back
        </Title>
        <Auth
          supabaseClient={supabaseClient}
          appearance={{ theme: ThemeSupa }}
          providers={[]} // Optional: add social providers
          theme="dark"
        />
      </Paper>
    </Container>
  );
}

export default Login;
