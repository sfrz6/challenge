import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ChallengeSeed = {
  orderIndex: number;
  title: string;
  snippet: string;
  language: string;
  correctLine: number | null;
  vulnCategory: string;
  difficulty: "easy" | "medium" | "hard";
};

const challenges: ChallengeSeed[] = [
  {
    orderIndex: 1,
    title: "Product search results",
    language: "php",
    vulnCategory: "Reflected XSS",
    difficulty: "easy",
    correctLine: 15,
    snippet: `<?php
$term = $_GET['q'] ?? '';
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 20;

$products = $catalog->search($term, $page, $perPage);
$total = count($products);

if ($total === 0) {
    http_response_code(404);
    echo "<p>No products matched your search.</p>";
    exit;
}

echo "<h1>Results for " . $term . "</h1>";
echo "<p>" . $total . " items found</p>";
foreach ($products as $product) {
    echo "<li>" . htmlspecialchars($product['name']) . "</li>";
}`,
  },
  {
    orderIndex: 2,
    title: "User lookup by username",
    language: "java",
    vulnCategory: "SQL Injection",
    difficulty: "easy",
    correctLine: 10,
    snippet: `@GetMapping("/api/users/{username}")
public ResponseEntity<UserDto> getUser(@PathVariable String username) throws SQLException {
    if (username == null || username.length() > 64) {
        return ResponseEntity.badRequest().build();
    }

    Connection conn = dataSource.getConnection();
    Statement stmt = conn.createStatement();

    String sql = "SELECT id, email, role FROM users WHERE username = '" + username + "'";
    ResultSet rs = stmt.executeQuery(sql);

    if (!rs.next()) {
        return ResponseEntity.notFound().build();
    }

    UserDto dto = new UserDto(rs.getLong("id"), rs.getString("email"));
    auditRepository.recordLookup(username, Instant.now());
    return ResponseEntity.ok(dto);
}`,
  },
  {
    orderIndex: 3,
    title: "Service configuration",
    language: "javascript",
    vulnCategory: "Hardcoded Password",
    difficulty: "easy",
    correctLine: 6,
    snippet: `const config = {
  port: process.env.PORT || 3000,
  dbHost: process.env.DB_HOST,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  adminPassword: "Admin@P4ssw0rd!",
  sessionTtlHours: 12,
};

function assertConfigured() {
  if (!config.dbHost || !config.dbUser) {
    throw new Error("database configuration missing");
  }
  if (!config.dbPassword) {
    throw new Error("DB_PASSWORD is required");
  }
}

module.exports = { config, assertConfigured };`,
  },
  {
    orderIndex: 4,
    title: "Account balance endpoint",
    language: "python",
    vulnCategory: "IDOR",
    difficulty: "medium",
    correctLine: 12,
    snippet: `@app.route("/api/accounts/<account_id>/balance")
def get_balance(account_id):
    token = request.headers.get("Authorization", "")
    user = verify_token(token.replace("Bearer ", ""))

    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    if not user.is_active:
        return jsonify({"error": "account suspended"}), 403

    account = db.accounts.find_by_id(account_id)

    if account is None:
        return jsonify({"error": "not found"}), 404

    audit.log("balance_viewed", user_id=user.id, account_id=account_id)
    return jsonify({"balance": account.balance, "currency": account.currency})`,
  },
  {
    orderIndex: 5,
    title: "Account statement endpoint",
    language: "python",
    vulnCategory: "No Vulnerability",
    difficulty: "medium",
    correctLine: null,
    snippet: `@app.route("/api/accounts/<account_id>/statement")
def get_statement(account_id):
    token = request.headers.get("Authorization", "")
    user = verify_token(token.replace("Bearer ", ""))

    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    if not user.is_active:
        return jsonify({"error": "account suspended"}), 403

    account = db.accounts.find_by_id(account_id)

    if account is None or account.owner_id != user.id:
        return jsonify({"error": "not found"}), 404

    audit.log("statement_viewed", user_id=user.id, account_id=account_id)
    return jsonify({"entries": account.statement_entries(limit=50)})`,
  },
  {
    orderIndex: 6,
    title: "File download controller",
    language: "java",
    vulnCategory: "Path Traversal",
    difficulty: "medium",
    correctLine: 11,
    snippet: `@GetMapping("/files/download")
public ResponseEntity<byte[]> download(@RequestParam String name) throws IOException {
    if (name == null || name.isEmpty()) {
        return ResponseEntity.badRequest().build();
    }

    if (name.length() > 255) {
        return ResponseEntity.badRequest().build();
    }

    File file = new File(UPLOAD_DIR, name);

    if (!file.exists() || file.isDirectory()) {
        return ResponseEntity.notFound().build();
    }

    byte[] data = Files.readAllBytes(file.toPath());
    log.info("served {} ({} bytes)", name, data.length);
    return ResponseEntity.ok().body(data);
}`,
  },
  {
    orderIndex: 7,
    title: "Login handler",
    language: "php",
    vulnCategory: "Sensitive Data Logging",
    difficulty: "easy",
    correctLine: 4,
    snippet: `<?php
function login(PDO $db, string $email, string $password): bool
{
    error_log("Login attempt: " . $email . " / " . $password);

    $stmt = $db->prepare('SELECT password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row === false) {
        return false;
    }

    return password_verify($password, $row['password_hash']);
}`,
  },
  {
    orderIndex: 8,
    title: "Partner invoice fetch",
    language: "python",
    vulnCategory: "Disabled TLS Verification",
    difficulty: "easy",
    correctLine: 7,
    snippet: `import requests

def fetch_partner_invoice(invoice_id):
    url = f"https://partner-api.example.com/invoices/{invoice_id}"
    headers = {"Authorization": f"Bearer {API_TOKEN}"}

    response = requests.get(url, headers=headers, verify=False)
    response.raise_for_status()

    return response.json()`,
  },
  {
    orderIndex: 9,
    title: "Network diagnostics",
    language: "javascript",
    vulnCategory: "Command Injection",
    difficulty: "medium",
    correctLine: 14,
    snippet: `const ALLOWED_COUNT = 3;

function isValidHost(host) {
  return typeof host === "string" && host.length > 0 && host.length < 256;
}

app.get("/api/diagnostics/ping", requireAdmin, (req, res) => {
  const host = req.query.host;

  if (!isValidHost(host)) {
    return res.status(400).json({ error: "invalid host" });
  }

  exec(\`ping -c \${ALLOWED_COUNT} \${host}\`, { timeout: 5000 }, (err, stdout) => {
    if (err) {
      return res.status(502).json({ error: "ping failed" });
    }
    res.type("text/plain").send(stdout);
  });
});`,
  },
  {
    orderIndex: 10,
    title: "Admin reports dashboard",
    language: "python",
    vulnCategory: "Broken Authentication",
    difficulty: "medium",
    correctLine: 9,
    snippet: `@app.route("/admin/reports")
@rate_limit(max_per_minute=30)
def admin_reports():
    cookie = request.cookies.get("session")

    if not cookie:
        return jsonify({"error": "unauthorized"}), 401

    payload = jwt.decode(cookie, options={"verify_signature": False})

    if payload.get("exp", 0) < time.time():
        return jsonify({"error": "session expired"}), 401

    if payload.get("role") != "admin":
        return jsonify({"error": "forbidden"}), 403

    audit.log("admin_report_viewed", user_id=payload.get("sub"))
    return jsonify(build_admin_report())`,
  },
];

async function main() {
  for (const challenge of challenges) {
    await prisma.challenge.upsert({
      where: { orderIndex: challenge.orderIndex },
      update: challenge,
      create: challenge,
    });
  }

  // Drop any challenges left over from a previous, longer challenge set.
  const removed = await prisma.challenge.deleteMany({
    where: { orderIndex: { gt: challenges.length } },
  });

  console.log(
    `Seeded ${challenges.length} challenges${removed.count ? `, removed ${removed.count} stale` : ""}.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
