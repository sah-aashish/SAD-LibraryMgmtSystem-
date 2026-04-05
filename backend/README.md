# Vivlix Backend

This backend uses MySQL.

1. Copy `.env.example` to `.env`
2. Update `backend/.env` with your MySQL credentials if needed
3. Create the MySQL database `vivlix_library`
4. Import the starter database with:

```bash
mysql -u root -p < database/seed.sql
```

5. Run:

```bash
C:\xampp\php\php.exe -S localhost:8000 -t public
```

Admin UI will be available at:

`http://localhost:8000/admin/`

Seeded demo accounts use password `password123`:

- `admin@vivlix.com`
- `librarian@vivlix.com`
- `student@vivlix.com`
