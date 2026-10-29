// Return actionable messages without logging driver errors, URIs, or credentials.
export function describeStartupError(error) {
  const errors = [];
  const pending = [error];
  const seen = new Set();
  while (pending.length && errors.length < 30) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current); errors.push(current);
    pending.push(current.cause, current.reason, current.errorResponse);
    if (current.servers instanceof Map) {
      for (const server of current.servers.values()) pending.push(server.error);
    }
  }
  const hasCode = code => errors.some(item => item.code === code);
  const message = errors.map(item => String(item.message ?? item.errmsg ?? '')).join(' ');
  if (hasCode('MONGODB_PASSWORD_MISSING')) return 'MongoDB password is missing. Open backend/.env and replace <db_password> in MONGODB_URI with your URL-encoded Atlas database-user password. Do not paste it into chat.';
  if (hasCode('MONGODB_URI_MISSING')) return 'Complete MONGODB_URI in backend/.env using Atlas > Cluster0 > Connect > Drivers. Include your database username and URL-encoded password.';
  if (error?.name === 'ZodError') {
    const fields = [...new Set(error.issues.map(issue => issue.path[0]).filter(key => /^[A-Z_]+$/.test(key)))];
    return `Invalid or missing environment settings: ${fields.join(', ')}. Update backend/.env using backend/.env.example; JWT_SECRET must contain at least 32 characters.`;
  }
  if (hasCode('EADDRINUSE')) return 'Backend port is already in use. Stop the other server using PORT (4000 by default), then start Learnova again.';
  if (hasCode(18) || /authentication failed|bad auth/i.test(message)) return 'Atlas authentication failed. Check the database username and password in backend/.env (these differ from your Atlas website login). URL-encode special characters in the password.';
  // Atlas also reports authorization failures as code 8000 (AtlasError),
  // so that code alone cannot distinguish a bad password from a missing privilege.
  if (hasCode(13) || /not authorized|unauthorized|user is not allowed to do action/i.test(message)) return 'Atlas authorization failed. In Atlas > Database Access > Edit learnova_user, grant readWrite on database learnova with the Collection field completely empty. Remove any literal "Leave blank" text: it restricts access to a collection with that name and prevents application collection/index setup.';
  if (errors.some(item => ['querySrv', 'queryTxt'].includes(item.syscall)) || errors.some(item => ['ENOTFOUND', 'EAI_AGAIN', 'ENODATA', 'ESERVFAIL', 'EREFUSED'].includes(item.code)) || (hasCode('ECONNREFUSED') && /querySrv|queryTxt|DNS/i.test(message))) return 'Atlas DNS lookup failed. Check your internet connection and the Cluster0 hostname in MONGODB_URI. Check whether your network blocks SRV/TXT DNS lookups. This happens before authentication or database permissions can be checked.';
  if (/certificate|TLS|SSL/i.test(message) || errors.some(item => /^(?:ERR_TLS_|ERR_SSL_|CERT_)/.test(item.code ?? '') || ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN'].includes(item.code))) return 'A secure MongoDB connection failed. Check the system clock, trusted certificates, and firewall/proxy TLS settings. Keep TLS enabled and certificate validation enabled.';
  if (errors.some(item => /ServerSelection|Network|Timeout/.test(item.name ?? '')) || errors.some(item => ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'].includes(item.code))) return 'Cannot reach MongoDB. For Atlas, open Network Access > Add IP Address > Add Current IP Address, and confirm Cluster0 is active. Check your internet connection and firewall. A timeout alone does not prove the IP access list is the cause.';
  if (/MongoParseError|MongoInvalidArgumentError/.test(error?.name ?? '')) return 'MONGODB_URI is invalid. Copy the Cluster0 Drivers connection string into backend/.env and URL-encode the database username/password. Keep /learnova before the question mark.';
  if (hasCode(11000)) return 'MongoDB index setup found conflicting existing values in learnova. Existing records were preserved; resolve the duplicate values before restarting.';
  return 'Startup or database verification failed. Check backend/.env, Atlas database-user permissions, and Network Access. Credentials have been omitted from this error.';
}
