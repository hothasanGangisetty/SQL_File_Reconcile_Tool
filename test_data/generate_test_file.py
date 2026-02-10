"""
Generate test@diff.xlsx - Excel file with deliberate differences from the SQL SampleData table.

Differences introduced:
  - Row 1:  Salary changed (45000.50 -> 45500.50) -- MISMATCH
  - Row 3:  Country changed (USA -> US) -- MISMATCH
  - Row 5:  Age added where SQL has NULL (NULL -> 22) -- MISMATCH
  - Row 7:  Email changed (priya@mail.com -> priya.new@mail.com) -- MISMATCH
  - Row 10: Age changed (32 -> 33), Remarks changed (Senior -> Senior Lead) -- MISMATCH
  - Row 13: Score changed (65 -> 72) -- MISMATCH
  - Row 11: REMOVED from file -- MISSING FROM FILE (Only in SQL)
  - Row 14: REMOVED from file -- MISSING FROM FILE (Only in SQL)
  - Row 18: ADDED (new row, not in SQL) -- EXTRA IN FILE
  - Row 19: ADDED (new row, not in SQL) -- EXTRA IN FILE

Expected reconciliation results:
  - 6 Mismatched rows (IDs: 1, 3, 5, 7, 10, 13)
  - 2 Missing from File (IDs: 11, 14)
  - 2 Extra in File (IDs: 18, 19)
  - 9 Matched rows (IDs: 2, 4, 6, 8, 9, 12, 15, 16, 17)
"""

import openpyxl
from openpyxl import Workbook
import os

wb = Workbook()
ws = wb.active
ws.title = "SampleData"

# Header row - must match SQL column names exactly
headers = [
    "RecordID", "UserName", "Age", "Salary", "IsActive", "JoinDate",
    "LoginTime", "LastLogin", "CreatedOn", "Rating", "Description",
    "Email", "PhoneNumber", "Country", "ZipCode", "BirthDate",
    "LoginCount", "Score", "LastUpdated", "Remarks"
]
ws.append(headers)

# Helper: None means empty cell in Excel
N = None

# fmt: off
rows = [
    # Row 1: MISMATCH - Salary 45000.50 -> 45500.50
    [1, "Arjun", 25, 45500.50, 1, "2023-01-10", "09:30:00", "2024-12-01 10:20:30", "2024-12-01 10:20", 4.5, "Good user", "arjun@gmail.com", "9876543210", "India", 500001, "1999-05-10", 120, 85, "2024-12-01 10:20:30.123", "Active"],

    # Row 2: MATCH (identical to SQL)
    [2, "Meera", N, 52000.00, 1, "2022-11-15", "10:00:00", "2024-11-20 09:10:15", "2024-11-20 09:10", 4.2, N, "meera@gmail.com", "9123456780", "India", N, "1998-08-12", 200, 90, "2024-11-20 09:10:15.456", "Good"],

    # Row 3: MISMATCH - Country USA -> US
    [3, "Rahul", 30, N, 0, "2021-06-01", "08:45:00", N, "2024-10-01 08:30", 3.8, "Average", N, "9988776655", "US", 75001, "1994-02-20", N, 70, "2024-10-01 08:30:00.789", N],

    # Row 4: MATCH
    [4, N, 28, 60000.75, 1, "2020-03-18", N, "2024-09-15 11:00:00", "2024-09-15 11:00", 4.9, "Excellent", "user4@mail.com", N, "Canada", N, "1996-11-05", 340, 95, "2024-09-15 11:00:00.111", "Top performer"],

    # Row 5: MISMATCH - Age NULL -> 22
    [5, "Sita", 22, N, 0, N, "12:15:00", "2024-08-01 12:15:00", "2024-08-01 12:15", N, N, N, "9000000000", "India", 600002, N, 50, N, "2024-08-01 12:15:00.222", N],

    # Row 6: MATCH
    [6, "John", 35, 72000.00, 1, "2019-07-09", "07:30:00", "2024-07-10 07:30:45", "2024-07-10 07:30", 4.0, "Consistent", "john@mail.com", "8888888888", "UK", N, "1989-04-18", 450, 88, "2024-07-10 07:30:45.333", "Stable"],

    # Row 7: MISMATCH - Email changed
    [7, "Priya", 26, 48000.00, 1, "2023-05-22", "09:00:00", N, "2024-06-20 09:00", 3.9, "Improving", "priya.new@mail.com", "7777777777", "India", N, "1998-01-30", 90, 78, "2024-06-20 09:00:00.444", N],

    # Row 8: MATCH
    [8, N, N, 39000.00, 0, "2022-02-14", "11:45:00", "2024-05-01 11:45:00", "2024-05-01 11:45", 2.5, N, N, N, "India", 500003, "1997-09-19", 30, 60, "2024-05-01 11:45:00.555", "Low activity"],

    # Row 9: MATCH
    [9, "Kiran", 29, 55000.00, 1, "2021-12-01", N, "2024-04-10 14:00:00", "2024-04-10 14:00", 4.1, "Reliable", "kiran@mail.com", "6666666666", "India", 500004, N, 210, 82, "2024-04-10 14:00:00.666", N],

    # Row 10: MISMATCH - Age 32->33, Remarks Senior->Senior Lead
    [10, "Amit", 33, 65000.00, 1, "2018-10-10", "08:00:00", "2024-03-01 08:00:00", "2024-03-01 08:00", 4.7, "Leader", "amit@mail.com", "5555555555", "India", 500005, "1992-06-15", 520, 92, "2024-03-01 08:00:00.777", "Senior Lead"],

    # Row 11: REMOVED from file (Only in SQL -- MISSING)

    # Row 12: MATCH
    [12, N, 40, 80000.00, 1, "2017-04-04", "06:45:00", "2024-01-15 06:45:00", "2024-01-15 06:45", 4.8, "Expert", "expert@mail.com", N, "USA", 90210, "1984-03-03", 800, 98, "2024-01-15 06:45:00.999", "High value"],

    # Row 13: MISMATCH - Score 65 -> 72
    [13, "Ravi", 27, N, 1, "2023-08-08", "09:15:00", "2023-12-12 09:15:00", "2023-12-12 09:15", N, "New hire", "ravi@mail.com", "3333333333", "India", 500006, "1997-07-07", 15, 72, "2023-12-12 09:15:00.101", N],

    # Row 14: REMOVED from file (Only in SQL -- MISSING)

    # Row 15: MATCH
    [15, "Vikram", N, 51000.00, 0, "2022-09-09", N, "2023-10-10 10:10:10", "2023-10-10 10:10", 3.6, "On leave", N, "1111111111", "India", 500007, N, 140, 75, "2023-10-10 10:10:10.303", N],

    # Row 16: MATCH
    [16, "Anjali", 24, 42000.00, 1, "2024-01-01", "09:45:00", "2024-01-02 09:45:00", "2024-01-02 09:45", 4.0, "Fresh graduate", "anjali@mail.com", N, "India", N, "2000-02-02", 10, 80, "2024-01-02 09:45:00.404", "New"],

    # Row 17: MATCH
    [17, "Deepak", 36, 70000.00, 1, "2016-06-06", "07:00:00", "2023-09-09 07:00:00", "2023-09-09 07:00", 4.6, "Veteran", "deepak@mail.com", "0000000000", "India", 500008, "1990-10-10", 600, 91, "2023-09-09 07:00:00.505", "Key member"],

    # Row 18: EXTRA in file (not in SQL)
    [18, "Pooja", 23, 38000.00, 1, "2024-06-15", "08:30:00", "2024-06-16 08:30:00", "2024-06-16 08:30", 3.5, "Intern promoted", "pooja@mail.com", "1234567890", "India", 500009, "2001-03-15", 5, 62, "2024-06-16 08:30:00.606", "Newly added"],

    # Row 19: EXTRA in file (not in SQL)
    [19, "Alex", 29, 58000.00, 1, "2024-02-20", "10:15:00", "2024-02-21 10:15:00", "2024-02-21 10:15", 4.1, "Transferred in", "alex@mail.com", "0987654321", "Germany", 10115, "1997-08-22", 180, 83, "2024-02-21 10:15:00.707", "From EU office"],
]
# fmt: on

for row in rows:
    ws.append(row)

# Auto-width columns
for col_idx, header in enumerate(headers, 1):
    col_letter = openpyxl.utils.get_column_letter(col_idx)
    ws.column_dimensions[col_letter].width = max(len(header) + 2, 14)

# Save
output_dir = os.path.join(os.path.dirname(__file__))
output_path = os.path.join(output_dir, "test@diff.xlsx")
wb.save(output_path)
print(f"Created: {output_path}")
print(f"Rows: {len(rows)} data rows + 1 header")
print()
print("Expected test results when compared against SQL SampleData:")
print("  Mismatched:       6 rows  (IDs: 1, 3, 5, 7, 10, 13)")
print("  Missing from File: 2 rows  (IDs: 11, 14)")
print("  Extra in File:     2 rows  (IDs: 18, 19)")
print("  Matched:           9 rows  (IDs: 2, 4, 6, 8, 9, 12, 15, 16, 17)")
