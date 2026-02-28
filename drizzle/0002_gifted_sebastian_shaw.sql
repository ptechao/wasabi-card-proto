CREATE TABLE `kyc_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kycId` int NOT NULL,
	`operatorId` int NOT NULL,
	`actionType` enum('submit','approve','reject','resubmit') NOT NULL,
	`previousStatus` enum('pending','submitted','approved','rejected'),
	`newStatus` enum('pending','submitted','approved','rejected') NOT NULL,
	`notes` text,
	`operatorName` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kyc_audit_logs_id` PRIMARY KEY(`id`)
);
