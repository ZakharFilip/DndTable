# Access (teams & permissions)

Session-scoped ACL for the interactive table (`gameSessionId`).

## Domain (shared package)

- `PermissionResolver`, `VisibilityResolver`, `TeamGraph` — `@dnd-table/shared` (`src/access/`)
- Tri-state permissions: missing grant = `Undefined`; stored as `Allow` | `Deny`
- Visibility: separate grants; default visible

## Collections

- `teams`, `team_user_members`, `session_participants`, `session_access_config`
- `global_permission_grants`, `object_permission_grants`, `object_visibility_grants`

## System teams

- `session-owner` — full access, not revocable via UI
- `visitors` — default for new joiners

## API

See `access.router.ts` under `/api/sessions/:id/access`.

Parties module ACL (`parties/acl`) is for future party editor; tabletop uses this module.
