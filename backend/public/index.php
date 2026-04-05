<?php
declare(strict_types=1);

use Vedas\Auth;
use Vedas\Config;
use Vedas\Database;
use Vedas\Request;
use Vedas\Response;
use Vedas\Validator;

require_once dirname(__DIR__) . '/src/bootstrap.php';

$method = Request::method();
$path = Request::path();

if (PHP_SAPI === 'cli-server') {
    $requested = __DIR__ . $path;
    if ($path !== '/' && (is_file($requested) || is_dir($requested))) {
        return false;
    }
}

$pdo = Database::connection();

try {
    if ($method === 'GET' && ($path === '/' || $path === '/index.php')) {
        header('Location: /frontend/');
        exit;
    }

    if ($method === 'POST' && $path === '/register') {
        $input = Request::json();
        $errors = array_merge(
            Validator::required($input, ['full_name', 'email', 'password']),
            Validator::email($input['email'] ?? null)
        );

        if (isset($input['password']) && strlen((string) $input['password']) < 8) {
            $errors['password'] = 'Password must be at least 8 characters.';
        }
        if ($errors !== []) {
            Response::error('Validation failed.', 422, ['errors' => $errors]);
        }

        $email = strtolower(trim((string) $input['email']));
        $existing = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $existing->execute(['email' => $email]);
        if ($existing->fetch()) {
            Response::error('Email is already registered.', 409);
        }

        $role = in_array(($input['role'] ?? 'member'), ['member', 'librarian', 'admin'], true) ? $input['role'] : 'member';
        $insert = $pdo->prepare(
            'INSERT INTO users (full_name, email, password_hash, role)
             VALUES (:full_name, :email, :password_hash, :role)'
        );
        $insert->execute([
            'full_name' => trim((string) $input['full_name']),
            'email' => $email,
            'password_hash' => password_hash((string) $input['password'], PASSWORD_DEFAULT),
            'role' => $role,
        ]);

        $userId = (int) $pdo->lastInsertId();
        $token = Auth::issueToken($pdo, $userId);

        Response::success([
            'token' => $token,
            'user' => [
                'id' => $userId,
                'full_name' => trim((string) $input['full_name']),
                'email' => $email,
                'role' => $role,
            ],
        ], 201);
    }

    if ($method === 'POST' && $path === '/login') {
        $input = Request::json();
        $errors = array_merge(
            Validator::required($input, ['email', 'password']),
            Validator::email($input['email'] ?? null)
        );
        if ($errors !== []) {
            Response::error('Validation failed.', 422, ['errors' => $errors]);
        }

        $email = strtolower(trim((string) $input['email']));
        $statement = $pdo->prepare('SELECT id, full_name, email, password_hash, role FROM users WHERE email = :email LIMIT 1');
        $statement->execute(['email' => $email]);
        $user = $statement->fetch();
        if (!$user || !password_verify((string) $input['password'], $user['password_hash'])) {
            Response::error('Invalid email or password.', 401);
        }

        $token = Auth::issueToken($pdo, (int) $user['id']);
        unset($user['password_hash']);
        Response::success(['token' => $token, 'user' => $user]);
    }

    if ($method === 'GET' && $path === '/books') {
        Auth::user(['member', 'librarian', 'admin']);
        $rows = $pdo->query('SELECT id, title, author, isbn, category, total_copies, available_copies, shelf_location FROM books ORDER BY id DESC')->fetchAll();
        Response::success(['books' => $rows]);
    }

    if ($method === 'POST' && $path === '/books') {
        $currentUser = Auth::user(['librarian', 'admin']);
        $input = Request::json();
        $errors = Validator::required($input, ['title', 'author']);
        $totalCopies = isset($input['total_copies']) ? (int) $input['total_copies'] : 1;
        $availableCopies = isset($input['available_copies']) ? (int) $input['available_copies'] : $totalCopies;

        if ($totalCopies < 1) {
            $errors['total_copies'] = 'total_copies must be at least 1.';
        }
        if ($availableCopies < 0 || $availableCopies > $totalCopies) {
            $errors['available_copies'] = 'available_copies must be between 0 and total_copies.';
        }
        if ($errors !== []) {
            Response::error('Validation failed.', 422, ['errors' => $errors]);
        }

        $statement = $pdo->prepare(
            'INSERT INTO books (title, author, isbn, category, total_copies, available_copies, shelf_location, created_by)
             VALUES (:title, :author, :isbn, :category, :total_copies, :available_copies, :shelf_location, :created_by)'
        );
        $statement->execute([
            'title' => trim((string) $input['title']),
            'author' => trim((string) $input['author']),
            'isbn' => trim((string) ($input['isbn'] ?? '')) ?: null,
            'category' => trim((string) ($input['category'] ?? '')) ?: null,
            'total_copies' => $totalCopies,
            'available_copies' => $availableCopies,
            'shelf_location' => trim((string) ($input['shelf_location'] ?? '')) ?: null,
            'created_by' => (int) $currentUser['id'],
        ]);
        Response::success(['book_id' => (int) $pdo->lastInsertId(), 'message' => 'Book created successfully.'], 201);
    }

    if ($method === 'PUT' && preg_match('#^/books/(\d+)$#', $path, $matches) === 1) {
        Auth::user(['librarian', 'admin']);
        $bookId = (int) $matches[1];
        $input = Request::json();
        $statement = $pdo->prepare('SELECT * FROM books WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $bookId]);
        $book = $statement->fetch();
        if (!$book) {
            Response::error('Book not found.', 404);
        }

        $title = trim((string) ($input['title'] ?? $book['title']));
        $author = trim((string) ($input['author'] ?? $book['author']));
        $totalCopies = isset($input['total_copies']) ? (int) $input['total_copies'] : (int) $book['total_copies'];
        $availableCopies = isset($input['available_copies']) ? (int) $input['available_copies'] : (int) $book['available_copies'];
        $errors = [];
        if ($title === '') $errors['title'] = 'title is required.';
        if ($author === '') $errors['author'] = 'author is required.';
        if ($totalCopies < 1) $errors['total_copies'] = 'total_copies must be at least 1.';
        if ($availableCopies < 0 || $availableCopies > $totalCopies) $errors['available_copies'] = 'available_copies must be between 0 and total_copies.';
        if ($errors !== []) {
            Response::error('Validation failed.', 422, ['errors' => $errors]);
        }

        $update = $pdo->prepare(
            'UPDATE books
             SET title = :title, author = :author, isbn = :isbn, category = :category,
                 total_copies = :total_copies, available_copies = :available_copies, shelf_location = :shelf_location
             WHERE id = :id'
        );
        $update->execute([
            'id' => $bookId,
            'title' => $title,
            'author' => $author,
            'isbn' => trim((string) ($input['isbn'] ?? $book['isbn'])) ?: null,
            'category' => trim((string) ($input['category'] ?? $book['category'])) ?: null,
            'total_copies' => $totalCopies,
            'available_copies' => $availableCopies,
            'shelf_location' => trim((string) ($input['shelf_location'] ?? $book['shelf_location'])) ?: null,
        ]);
        Response::success(['message' => 'Book updated successfully.']);
    }

    if ($method === 'DELETE' && preg_match('#^/books/(\d+)$#', $path, $matches) === 1) {
        Auth::user(['librarian', 'admin']);
        $bookId = (int) $matches[1];
        $activeIssue = $pdo->prepare('SELECT id FROM book_issues WHERE book_id = :book_id AND status IN ("issued","overdue") LIMIT 1');
        $activeIssue->execute(['book_id' => $bookId]);
        if ($activeIssue->fetch()) {
            Response::error('Cannot delete a book that is currently issued.', 409);
        }

        $delete = $pdo->prepare('DELETE FROM books WHERE id = :id');
        $delete->execute(['id' => $bookId]);
        if ($delete->rowCount() === 0) {
            Response::error('Book not found.', 404);
        }
        Response::success(['message' => 'Book deleted successfully.']);
    }

    if ($method === 'POST' && $path === '/issue-book') {
        $currentUser = Auth::user(['librarian', 'admin']);
        $input = Request::json();
        $errors = Validator::required($input, ['user_id', 'book_id']);
        if ($errors !== []) {
            Response::error('Validation failed.', 422, ['errors' => $errors]);
        }

        $settings = $pdo->query('SELECT fine_per_day, max_books_per_member, max_issue_days FROM system_settings WHERE id = 1')->fetch();
        $issueDate = trim((string) ($input['issue_date'] ?? date('Y-m-d')));
        $dueDate = trim((string) ($input['due_date'] ?? date('Y-m-d', strtotime('+' . ((int) $settings['max_issue_days']) . ' days'))));

        $bookStatement = $pdo->prepare('SELECT * FROM books WHERE id = :id LIMIT 1');
        $bookStatement->execute(['id' => (int) $input['book_id']]);
        $book = $bookStatement->fetch();
        if (!$book) Response::error('Book not found.', 404);
        if ((int) $book['available_copies'] < 1) Response::error('No copies are available for this book.', 409);

        $userStatement = $pdo->prepare('SELECT id FROM users WHERE id = :id LIMIT 1');
        $userStatement->execute(['id' => (int) $input['user_id']]);
        if (!$userStatement->fetch()) Response::error('User not found.', 404);

        $countStatement = $pdo->prepare('SELECT COUNT(*) FROM book_issues WHERE user_id = :user_id AND status IN ("issued","overdue")');
        $countStatement->execute(['user_id' => (int) $input['user_id']]);
        if ((int) $countStatement->fetchColumn() >= (int) $settings['max_books_per_member']) {
            Response::error('User has reached the maximum allowed issued books.', 409);
        }

        $pdo->beginTransaction();
        $issue = $pdo->prepare(
            'INSERT INTO book_issues (user_id, book_id, issued_by, issue_date, due_date, status, fine_amount, notes)
             VALUES (:user_id, :book_id, :issued_by, :issue_date, :due_date, "issued", 0.00, :notes)'
        );
        $issue->execute([
            'user_id' => (int) $input['user_id'],
            'book_id' => (int) $input['book_id'],
            'issued_by' => (int) $currentUser['id'],
            'issue_date' => $issueDate,
            'due_date' => $dueDate,
            'notes' => trim((string) ($input['notes'] ?? '')) ?: null,
        ]);
        $updateBook = $pdo->prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = :id');
        $updateBook->execute(['id' => (int) $input['book_id']]);
        $pdo->commit();

        Response::success(['issue_id' => (int) $pdo->lastInsertId(), 'message' => 'Book issued successfully.'], 201);
    }

    if ($method === 'POST' && $path === '/return-book') {
        Auth::user(['librarian', 'admin']);
        $input = Request::json();
        $errors = Validator::required($input, ['issue_id']);
        if ($errors !== []) {
            Response::error('Validation failed.', 422, ['errors' => $errors]);
        }

        $issueStatement = $pdo->prepare('SELECT * FROM book_issues WHERE id = :id LIMIT 1');
        $issueStatement->execute(['id' => (int) $input['issue_id']]);
        $issue = $issueStatement->fetch();
        if (!$issue) Response::error('Issue record not found.', 404);
        if ($issue['status'] === 'returned') Response::error('Book has already been returned.', 409);

        $settings = $pdo->query('SELECT fine_per_day FROM system_settings WHERE id = 1')->fetch();
        $returnDate = trim((string) ($input['return_date'] ?? date('Y-m-d')));
        $fine = calculateFine($issue['due_date'], $returnDate, (float) $settings['fine_per_day']);

        $pdo->beginTransaction();
        $updateIssue = $pdo->prepare('UPDATE book_issues SET return_date = :return_date, status = "returned", fine_amount = :fine_amount WHERE id = :id');
        $updateIssue->execute([
            'id' => (int) $input['issue_id'],
            'return_date' => $returnDate,
            'fine_amount' => $fine,
        ]);
        $updateBook = $pdo->prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = :book_id');
        $updateBook->execute(['book_id' => (int) $issue['book_id']]);
        $pdo->commit();

        Response::success(['fine_amount' => $fine, 'message' => 'Book returned successfully.']);
    }

    if ($method === 'GET' && $path === '/dashboard-stats') {
        Auth::user(['librarian', 'admin']);
        $totalBooks = (int) $pdo->query('SELECT COUNT(*) FROM books')->fetchColumn();
        $totalMembers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'member'")->fetchColumn();
        $issuedBooks = (int) $pdo->query("SELECT COUNT(*) FROM book_issues WHERE status IN ('issued','overdue')")->fetchColumn();
        $returnedBooks = (int) $pdo->query("SELECT COUNT(*) FROM book_issues WHERE status = 'returned'")->fetchColumn();
        $overdueBooks = (int) $pdo->query("SELECT COUNT(*) FROM book_issues WHERE status = 'overdue'")->fetchColumn();
        $collectedFines = (float) $pdo->query("SELECT COALESCE(SUM(fine_amount), 0) FROM book_issues WHERE status = 'returned'")->fetchColumn();

        Response::success([
            'total_books' => $totalBooks,
            'total_members' => $totalMembers,
            'issued_books' => $issuedBooks,
            'returned_books' => $returnedBooks,
            'overdue_books' => $overdueBooks,
            'collected_fines' => round($collectedFines, 2),
        ]);
    }

    if ($method === 'GET' && $path === '/users') {
        Auth::user(['librarian', 'admin']);
        $users = $pdo->query('SELECT id, full_name, email, role FROM users ORDER BY id DESC')->fetchAll();
        Response::success(['users' => $users]);
    }

    if ($method === 'GET' && $path === '/issues') {
        Auth::user(['librarian', 'admin']);
        $issues = $pdo->query(
            'SELECT book_issues.id, users.full_name AS member, users.id AS user_id, books.title AS book,
                    books.id AS book_id, issue_date, due_date, return_date, status, fine_amount
             FROM book_issues
             INNER JOIN users ON users.id = book_issues.user_id
             INNER JOIN books ON books.id = book_issues.book_id
             ORDER BY book_issues.id DESC'
        )->fetchAll();
        Response::success(['issues' => $issues]);
    }

    if ($method === 'GET' && $path === '/settings') {
        Auth::user(['librarian', 'admin']);
        $settings = $pdo->query('SELECT fine_per_day, max_books_per_member, max_issue_days FROM system_settings WHERE id = 1')->fetch();
        Response::success(['settings' => $settings ?: ['fine_per_day' => 1.00, 'max_books_per_member' => 5, 'max_issue_days' => 14]]);
    }

    if ($method === 'PUT' && $path === '/settings') {
        Auth::user(['admin']);
        $input = Request::json();
        $maxBooks = isset($input['max_books_per_member']) ? (int) $input['max_books_per_member'] : 5;
        $maxDays = isset($input['max_issue_days']) ? (int) $input['max_issue_days'] : 14;
        $finePerDay = isset($input['fine_per_day']) ? (float) $input['fine_per_day'] : 1.00;

        if ($maxBooks < 1 || $maxDays < 1 || $finePerDay < 0) {
            Response::error('Invalid settings values supplied.', 422);
        }

        $statement = $pdo->prepare(
            'UPDATE system_settings
             SET fine_per_day = :fine_per_day, max_books_per_member = :max_books_per_member, max_issue_days = :max_issue_days
             WHERE id = 1'
        );
        $statement->execute([
            'fine_per_day' => $finePerDay,
            'max_books_per_member' => $maxBooks,
            'max_issue_days' => $maxDays,
        ]);

        Response::success(['message' => 'Settings updated successfully.']);
    }

    Response::error('Route not found.', 404);
} catch (Throwable $throwable) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Response::error('Internal server error.', 500, [
        'details' => Config::get('APP_ENV') === 'development' ? $throwable->getMessage() : null,
    ]);
}

function calculateFine(string $dueDate, string $returnDate, float $finePerDay): float
{
    $due = new DateTimeImmutable($dueDate);
    $returned = new DateTimeImmutable($returnDate);
    if ($returned <= $due) {
        return 0.0;
    }
    return round(((int) $due->diff($returned)->format('%a')) * $finePerDay, 2);
}
