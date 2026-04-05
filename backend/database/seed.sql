CREATE DATABASE IF NOT EXISTS vivlix_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vivlix_library;
SOURCE d:/sad-website/backend/database/schema.sql;
INSERT INTO users (full_name, email, password_hash, role)
SELECT 'Admin User', 'admin@vivlix.com', '$2y$10$AFT2xbAIqHMT7pFIipVRke/DJ0nweytCgArB97WwREhfhuEgT8Qbi', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@vivlix.com');
INSERT INTO users (full_name, email, password_hash, role)
SELECT 'Librarian User', 'librarian@vivlix.com', '$2y$10$AFT2xbAIqHMT7pFIipVRke/DJ0nweytCgArB97WwREhfhuEgT8Qbi', 'librarian'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'librarian@vivlix.com');
INSERT INTO users (full_name, email, password_hash, role)
SELECT 'Student User', 'student@vivlix.com', '$2y$10$AFT2xbAIqHMT7pFIipVRke/DJ0nweytCgArB97WwREhfhuEgT8Qbi', 'member'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student@vivlix.com');
INSERT INTO books (title, author, isbn, category, total_copies, available_copies, shelf_location, created_by)
SELECT 'Advance Java', 'Maya Sharma', '978000000001', 'Programming', 3, 2, 'A-12', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE isbn = '978000000001');
INSERT INTO books (title, author, isbn, category, total_copies, available_copies, shelf_location, created_by)
SELECT 'Modern Library Operations', 'R. Adhikari', '978000000002', 'Business', 2, 2, 'B-04', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE isbn = '978000000002');
INSERT INTO books (title, author, isbn, category, total_copies, available_copies, shelf_location, created_by)
SELECT 'Database Systems', 'S. Bhandari', '978000000003', 'Technology', 4, 3, 'C-07', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE isbn = '978000000003');
INSERT INTO books (title, author, isbn, category, total_copies, available_copies, shelf_location, created_by)
SELECT 'Physics for Engineers', 'D. KC', '978000000004', 'Science', 5, 5, 'D-15', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE isbn = '978000000004');
INSERT INTO books (title, author, isbn, category, total_copies, available_copies, shelf_location, created_by)
SELECT 'Digital Design Basics', 'Anita Joshi', '978000000005', 'Engineering', 2, 2, 'E-02', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE isbn = '978000000005');

INSERT INTO book_issues (user_id, book_id, issued_by, issue_date, due_date, status, fine_amount, notes)
SELECT 3, 1, 2, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'issued', 0.00, 'Seeded sample issue'
WHERE NOT EXISTS (
  SELECT 1
  FROM book_issues
  WHERE user_id = 3 AND book_id = 1 AND status = 'issued'
);

UPDATE books
SET available_copies = GREATEST(total_copies - (
  SELECT COUNT(*)
  FROM book_issues
  WHERE book_issues.book_id = books.id
    AND book_issues.status IN ('issued', 'overdue')
), 0);
