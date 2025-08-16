## Social (Follows, Contacts, Stories) Module

### Features
- **Follows:** Users can follow/unfollow each other. Enables social feeds and "People you may know."
- **Contacts:** Add mutual contacts for direct/group chats and private sharing.
- **Stories:** Post 24-hour expiring media. Supports image/video, privacy (public/private), and captions.

### Endpoints
- `POST /users/:id/follow` — Follow a user
- `POST /users/:id/unfollow` — Unfollow
- `GET /users/:id/followers` — List followers
- `GET /users/:id/following` — List following
- `POST /users/:id/contact` — Add contact
- `GET /users/me/contacts` — Get your contacts
- `POST /stories` — Create a story
- `GET /stories` — Get public stories
- `GET /users/:id/stories` — Get stories by user

### Notes
- All POST endpoints (except fetch/list) require JWT authentication.
- Contacts are mutual — both users get added to each other's contact list.
- Stories auto-expire after 24 hours.
