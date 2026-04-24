# Security Specification - Predicación en Grupo

## 1. Data Invariants
- A marker or contact must belong to an authenticated user (`ownerId`).
- Only the owner can read/write their own markers, contacts, and history.
- `createdAt` and `ownerId` are immutable.
- `email_verified` must be true for write operations (if applicable, but since it's a productivity app, I'll allow standard verified users).

## 2. The Dirty Dozen (Attacks and Malformed Payloads)
1. **Identity Spoofing**: User A tries to create a marker with `ownerId: "UserB"`.
2. **Resource Hijacking**: User A tries to update User B's contact info.
3. **Ghost Field**: Adding `isAdmin: true` to a user profile.
4. **Invalid Type**: Sending a string for `lat` or `lng`.
5. **Denial of Wallet**: Sending a 1MB string for a contact name.
6. **Path Poisoning**: IDs with junk characters.
7. **Bypassing Verification**: User without verified email (if strict mode is on).
8. **Orphaned Writes**: Creating a history record for a `targetId` that doesn't exist (though history might be loosely coupled, it's better to guard).
9. **State Shortcutting**: Manually setting `status: "completed"` without proper flow.
10. **Immortal Field Update**: Changing `createdAt` date.
11. **Future Prediction**: Setting `lastVisitDate` to a future date beyond current server time.
12. **Blanket Read Request**: Trying to fetch all contacts from any user without filtering by `ownerId`.

## 3. Test Runner (Draft Plan)
I will implement rules that handle these cases by:
- Verifying `request.auth.uid == incoming().ownerId`.
- Verifying property types and sizes with `isValid[Entity]`.
- Enforcing `affectedKeys().hasOnly()` for updates.
