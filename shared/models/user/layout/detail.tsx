import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"User"> = {
  fields: {
    vertical: [
      {
        horizontal: [{ col: "id" }, { col: "id" }],
      },
      {
        horizontal: [
          {
            col: "username",
          },
          {
            col: "username",
          },
        ],
      },
      {
        horizontal: [
          {
            col: "email",
          },
          {
            col: "email",
          },
        ],
      },
      {
        horizontal: [
          {
            col: "password_hash",
          },
          {
            col: "password_hash",
          },
        ],
      },
      {
        horizontal: [
          {
            col: "verification_token",
          },
          {
            col: "verification_token",
          },
        ],
      },
      {
        horizontal: [
          {
            col: "email_verified_at",
          },
          {
            col: "email_verified_at",
          },
        ],
      },
      {
        horizontal: [
          {
            col: "reset_token",
          },
          {
            col: "reset_token",
          },
        ],
      },
      {
        horizontal: [
          {
            col: "reset_token_expires",
          },
          {
            col: "reset_token_expires",
          },
        ],
      },
      {
        horizontal: [
          {
            col: "id_role",
          },
          {
            col: "id_role",
          },
        ],
      },
    ],
  },
  tabs: [
    { title: "Detail", type: "default" },
    {
      title: "Actionlogs",
      type: "relation",
      name: "actionlogs",
    },
    {
      title: "Changelogs",
      type: "relation",
      name: "changelogs",
    },
    {
      title: "Sessions",
      type: "relation",
      name: "sessions",
    },
    {
      title: "Role",
      type: "relation",
      name: "role",
    },
  ],
};
