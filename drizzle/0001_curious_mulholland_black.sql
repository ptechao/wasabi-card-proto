CREATE TABLE `atm_withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cardId` int NOT NULL,
	`wasabiOrderNo` varchar(128),
	`merchantOrderNo` varchar(128),
	`amount` decimal(18,2) NOT NULL,
	`fee` decimal(18,2) DEFAULT '0.00',
	`currency` varchar(8) DEFAULT 'USD',
	`atmStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`activationCode` varchar(64),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `atm_withdrawals_id` PRIMARY KEY(`id`),
	CONSTRAINT `atm_withdrawals_merchantOrderNo_unique` UNIQUE(`merchantOrderNo`)
);
--> statement-breakpoint
CREATE TABLE `kyc_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wasabiHolderId` varchar(64),
	`merchantOrderNo` varchar(128),
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`dob` varchar(10) NOT NULL,
	`nationality` varchar(8) NOT NULL,
	`mobileAreaCode` varchar(8),
	`mobilePhone` varchar(32),
	`email` varchar(320),
	`address` text,
	`city` varchar(128),
	`state` varchar(128),
	`postalCode` varchar(32),
	`idType` varchar(32),
	`idNumber` varchar(128),
	`idFrontUrl` text,
	`idBackUrl` text,
	`selfieUrl` text,
	`status` enum('pending','submitted','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kyc_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `kyc_records_merchantOrderNo_unique` UNIQUE(`merchantOrderNo`)
);
--> statement-breakpoint
CREATE TABLE `three_ds_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardNo` varchar(64) NOT NULL,
	`tradeNo` varchar(128),
	`verificationType` enum('otp','auth_url') NOT NULL,
	`verificationValue` text NOT NULL,
	`isRead` int DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `three_ds_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardId` int NOT NULL,
	`userId` int NOT NULL,
	`wasabiTxId` varchar(128),
	`merchantOrderNo` varchar(128),
	`type` enum('deposit','withdrawal','purchase','refund','fee','create') NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`fee` decimal(18,2) DEFAULT '0.00',
	`currency` varchar(8) DEFAULT 'USD',
	`txStatus` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`merchantName` varchar(256),
	`description` text,
	`transactionTime` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `virtual_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wasabiCardNo` varchar(64),
	`merchantOrderNo` varchar(128),
	`cardLast4` varchar(4),
	`cardBin` varchar(8),
	`cardTypeId` varchar(64),
	`cardTypeName` varchar(128),
	`holderId` varchar(64),
	`status` enum('pending','active','frozen','cancelled') NOT NULL DEFAULT 'pending',
	`availableBalance` decimal(18,2) DEFAULT '0.00',
	`currency` varchar(8) DEFAULT 'USD',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `virtual_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `virtual_cards_merchantOrderNo_unique` UNIQUE(`merchantOrderNo`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(64) NOT NULL,
	`payload` text NOT NULL,
	`webhookStatus` enum('received','processed','failed') NOT NULL DEFAULT 'received',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
