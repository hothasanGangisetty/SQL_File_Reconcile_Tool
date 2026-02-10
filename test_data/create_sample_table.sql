-- ============================================================
-- SQL File Reconcile Tool - Test Data Setup
-- Run this in SQL Server Management Studio or sqlcmd
-- ============================================================

-- Drop table if it already exists
IF OBJECT_ID('dbo.SampleData', 'U') IS NOT NULL
    DROP TABLE dbo.SampleData;

CREATE TABLE SampleData (
    RecordID INT PRIMARY KEY,
    UserName VARCHAR(50),
    Age INT,
    Salary DECIMAL(10,2),
    IsActive BIT,
    JoinDate DATE,
    LoginTime TIME,
    LastLogin DATETIME,
    CreatedOn SMALLDATETIME,
    Rating FLOAT,
    Description TEXT,
    Email NVARCHAR(100),
    PhoneNumber CHAR(10),
    Country VARCHAR(50),
    ZipCode INT,
    BirthDate DATE,
    LoginCount BIGINT,
    Score SMALLINT,
    LastUpdated DATETIME2,
    Remarks VARCHAR(255)
);

INSERT INTO SampleData VALUES
(1,'Arjun',25,45000.50,1,'2023-01-10','09:30:00','2024-12-01 10:20:30','2024-12-01 10:20',4.5,'Good user','arjun@gmail.com','9876543210','India',500001,'1999-05-10',120,85,'2024-12-01 10:20:30.123','Active'),
(2,'Meera',NULL,52000.00,1,'2022-11-15','10:00:00','2024-11-20 09:10:15','2024-11-20 09:10',4.2,NULL,'meera@gmail.com','9123456780','India',NULL,'1998-08-12',200,90,'2024-11-20 09:10:15.456','Good'),
(3,'Rahul',30,NULL,0,'2021-06-01','08:45:00',NULL,'2024-10-01 08:30',3.8,'Average',NULL,'9988776655','USA',75001,'1994-02-20',NULL,70,'2024-10-01 08:30:00.789',NULL),
(4,NULL,28,60000.75,1,'2020-03-18',NULL,'2024-09-15 11:00:00','2024-09-15 11:00',4.9,'Excellent','user4@mail.com',NULL,'Canada',NULL,'1996-11-05',340,95,'2024-09-15 11:00:00.111','Top performer'),
(5,'Sita',NULL,NULL,0,NULL,'12:15:00','2024-08-01 12:15:00','2024-08-01 12:15',NULL,NULL,NULL,'9000000000','India',600002,NULL,50,NULL,'2024-08-01 12:15:00.222',NULL),
(6,'John',35,72000.00,1,'2019-07-09','07:30:00','2024-07-10 07:30:45','2024-07-10 07:30',4.0,'Consistent','john@mail.com','8888888888','UK',NULL,'1989-04-18',450,88,'2024-07-10 07:30:45.333','Stable'),
(7,'Priya',26,48000.00,1,'2023-05-22','09:00:00',NULL,'2024-06-20 09:00',3.9,'Improving','priya@mail.com','7777777777','India',NULL,'1998-01-30',90,78,'2024-06-20 09:00:00.444',NULL),
(8,NULL,NULL,39000.00,0,'2022-02-14','11:45:00','2024-05-01 11:45:00','2024-05-01 11:45',2.5,NULL,NULL,NULL,'India',500003,'1997-09-19',30,60,'2024-05-01 11:45:00.555','Low activity'),
(9,'Kiran',29,55000.00,1,'2021-12-01',NULL,'2024-04-10 14:00:00','2024-04-10 14:00',4.1,'Reliable','kiran@mail.com','6666666666','India',500004,NULL,210,82,'2024-04-10 14:00:00.666',NULL),
(10,'Amit',32,65000.00,1,'2018-10-10','08:00:00','2024-03-01 08:00:00','2024-03-01 08:00',4.7,'Leader','amit@mail.com','5555555555','India',500005,'1992-06-15',520,92,'2024-03-01 08:00:00.777','Senior'),
(11,'Neha',NULL,47000.00,0,'2020-01-20','10:30:00',NULL,'2024-02-01 10:30',3.2,NULL,NULL,'4444444444','India',NULL,'1995-12-12',75,68,'2024-02-01 10:30:00.888',NULL),
(12,NULL,40,80000.00,1,'2017-04-04','06:45:00','2024-01-15 06:45:00','2024-01-15 06:45',4.8,'Expert','expert@mail.com',NULL,'USA',90210,'1984-03-03',800,98,'2024-01-15 06:45:00.999','High value'),
(13,'Ravi',27,NULL,1,'2023-08-08','09:15:00','2023-12-12 09:15:00','2023-12-12 09:15',NULL,'New hire','ravi@mail.com','3333333333','India',500006,'1997-07-07',15,65,'2023-12-12 09:15:00.101',NULL),
(14,'Sara',31,59000.00,1,NULL,'11:00:00','2023-11-01 11:00:00','2023-11-01 11:00',4.3,NULL,'sara@mail.com','2222222222','UK',NULL,'1993-05-25',260,87,'2023-11-01 11:00:00.202','Good'),
(15,'Vikram',NULL,51000.00,0,'2022-09-09',NULL,'2023-10-10 10:10:10','2023-10-10 10:10',3.6,'On leave',NULL,'1111111111','India',500007,NULL,140,75,'2023-10-10 10:10:10.303',NULL),
(16,'Anjali',24,42000.00,1,'2024-01-01','09:45:00','2024-01-02 09:45:00','2024-01-02 09:45',4.0,'Fresh graduate','anjali@mail.com',NULL,'India',NULL,'2000-02-02',10,80,'2024-01-02 09:45:00.404','New'),
(17,'Deepak',36,70000.00,1,'2016-06-06','07:00:00','2023-09-09 07:00:00','2023-09-09 07:00',4.6,'Veteran','deepak@mail.com','0000000000','India',500008,'1990-10-10',600,91,'2023-09-09 07:00:00.505','Key member');

-- Verify
SELECT COUNT(*) AS TotalRows FROM SampleData;
SELECT * FROM SampleData ORDER BY RecordID;
