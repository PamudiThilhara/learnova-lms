# Learnova MongoDB Atlas setup and startup troubleshooting

The backend loads `backend/.env` relative to `config/env.js`, regardless of the terminal's working directory. Existing process environment variables take precedence. Application data always uses database **learnova**, even when a copied URI names another database. The configured Atlas database username is **learnova_user**.

## Fix the confirmed database-user permission error

The October 29, 2026 investigation confirmed that the configured credentials authenticate over TLS and that a ping to **learnova** succeeds. Database verification then fails with **MongoServerError, code 8000 (AtlasError)**: `user is not allowed to do action [createCollection]`.

Atlas reports a `readWrite` privilege on `learnova` whose collection scope is the literal text **Leave blank**. That permits access only to a collection with that name. The backend needs to create its application collections and indexes throughout `learnova`.

1. Open MongoDB Atlas and select **Project 0**.
2. Open **Security > Database Access** (also called **Database & Network Access > Database Users**).
3. Find **learnova_user** and click **Edit**.
4. Under **Specific Privileges**, set the role to **readWrite** and database to **learnova**.
5. Clear the **Collection** field completely. Delete the literal text **Leave blank**; do not replace it with another name or an asterisk.
6. Save the user and wait for Atlas to apply the change.
7. Run the database check below, then start the backend.

This keeps access limited to the `learnova` database. No password reset, administrator role, new database user, or broader network access is needed for this authorization error. Existing records must remain untouched.

## Verify and start

Run from `C:\pamudi\smartlearn-lms`:

```powershell
npm.cmd --prefix backend run check:db
npm.cmd run dev:backend
```

The check first reports a successful connection/authentication, then verifies permissions by creating a uniquely named temporary collection, inserting and reading a temporary document, deleting that document, and dropping only its own temporary collection. Success ends with **PASS**. The check does not import application models, seed data, or change existing records.

The backend listens on port **4000** after MongoDB and its application indexes are ready. Open **http://localhost:4000/api/health**; a healthy backend returns `{"status":"ok","database":"connected"}`. Start the frontend separately with `npm.cmd run dev:frontend` if needed. No frontend design changes are required.

## If a different connection error occurs

- **Authentication failed:** verify the database username is `learnova_user`. If the database-user password is unknown, use Atlas > Database Access > Edit learnova_user to reset it, then update only the password in `backend/.env` locally. URL-encode special characters exactly once. Never send passwords, JWT secrets, or connection strings in chat. Keep `/learnova` as the database path. Atlas SRV DNS supplies `authSource=admin`; retain Atlas's supplied connection options.
- **DNS lookup failed:** the connection cannot yet reach Atlas. Check internet access and the Drivers hostname, and ask your network administrator whether SRV/TXT DNS lookups are blocked. Restricted execution environments can also block these lookups. This does not establish a password or role problem.
- **Network timeout after DNS succeeds:** confirm Cluster0 is active and the backend machine's current public IP is in Atlas > Network Access. If missing, use **Add IP Address > Add Current IP Address**, then wait for the entry to become active. Keep access limited to the required IP; do not open access to all addresses. A timeout alone does not prove an access-list issue.
- **TLS/certificate failure:** check the system clock, trusted certificates, and proxy/firewall settings. Keep TLS and certificate validation enabled.
- **Invalid environment settings:** check the named fields in `backend/.env` against `.env.example`. `JWT_SECRET` must have at least 32 characters. Remove stale process-level overrides if they are taking precedence over the file.

References: [Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/), [Atlas database-user privileges](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/), [Mongoose connections and database selection](https://mongoosejs.com/docs/connections.html).
