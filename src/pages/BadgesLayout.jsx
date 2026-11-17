import React from "react";
import { Container, SegmentedControl } from "@mantine/core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { PATHS } from "../constants/MyClasses.ts";

// One nav entry, Badges, with two views: the badges and the passport. Each
// view keeps its own URL, so /badges and /passport both work as links, and the
// switch moves between them.
function BadgesLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  return (
    <>
      {/* The routes below redirect a signed-out visitor, so no switch for them. */}
      {user && (
        <Container size="lg" mt="md">
          <SegmentedControl
            fullWidth
            maw={360}
            size="md"
            // 36 px options on a 4 px track make the 44 px touch target.
            styles={{ label: { minHeight: 36, alignContent: "center" } }}
            aria-label={t("nav.badges_views")}
            value={pathname}
            onChange={(to) => navigate(to)}
            data={[
              { value: PATHS.BADGES, label: t("nav.badges") },
              { value: PATHS.PASSPORT, label: t("nav.passport") },
            ]}
          />
        </Container>
      )}
      <Outlet />
    </>
  );
}

export default BadgesLayout;
