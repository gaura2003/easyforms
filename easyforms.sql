-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 17, 2025 at 09:10 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `easyforms`
--

-- --------------------------------------------------------

--
-- Table structure for table `forms`
--

CREATE TABLE `forms` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `endpoint_id` varchar(255) NOT NULL,
  `redirect_url` varchar(255) DEFAULT NULL,
  `email_notifications` tinyint(1) DEFAULT 1,
  `spam_protection` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `forms`
--

INSERT INTO `forms` (`id`, `user_id`, `name`, `title`, `description`, `endpoint_id`, `redirect_url`, `email_notifications`, `spam_protection`, `created_at`, `updated_at`) VALUES
(1, 2, '', NULL, NULL, 'wfsq1u8rch1qchuywx2t2h', NULL, 1, 1, '2025-05-17 10:09:17', '2025-05-17 10:09:17'),
(2, 2, '', NULL, NULL, 'blf83pme3j8o2hi5q1898i', NULL, 1, 1, '2025-05-17 10:15:35', '2025-05-17 10:15:35');

-- --------------------------------------------------------

--
-- Table structure for table `form_fields`
--

CREATE TABLE `form_fields` (
  `id` int(11) NOT NULL,
  `form_id` int(11) NOT NULL,
  `label` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `required` tinyint(1) DEFAULT 0,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `position` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `id` int(11) NOT NULL,
  `form_id` int(11) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `submissions`
--

INSERT INTO `submissions` (`id`, `form_id`, `data`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, '{\"name\":\"gulshan Prajapat\",\"email\":\"moyece2217@calmpros.com\",\"message\":\"thesst\",\"_gotcha\":\"\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36', '2025-05-17 10:16:56'),
(2, 1, '{\"name\":\"gulshan Prajapat\",\"email\":\"moyece2217@calmpros.com\",\"message\":\"thesst\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36', '2025-05-17 10:21:09'),
(3, 2, '{\"name\":\"Felicia Sanders\",\"email\":\"lewusoz@mailinator.com\",\"phone\":\"+1 (469) 347-3639\",\"age\":\"4\",\"gender\":\"Female\",\"address\":\"Nihil aliquam velit\",\"notes\":\"Inventore nostrum ma\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36', '2025-05-17 18:59:42'),
(4, 2, '{\"name\":\"Gaurav Prajapat\",\"email\":\"gauravprajapat2305@gmail.com\",\"phone\":\"07440305830\",\"age\":\"45\",\"gender\":\"Female\",\"address\":\"Giriraj ratan kanipura road Tarana Road\",\"notes\":\"kjh\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36', '2025-05-17 19:02:23');

-- --------------------------------------------------------

--
-- Table structure for table `subscription_plans`
--

CREATE TABLE `subscription_plans` (
  `id` int(11) NOT NULL,
  `name` enum('free','pro','enterprise') NOT NULL,
  `monthly_price` decimal(10,2) NOT NULL,
  `yearly_price` decimal(10,2) NOT NULL,
  `form_limit` int(11) NOT NULL,
  `submission_limit_monthly` int(11) NOT NULL,
  `custom_redirect` tinyint(1) DEFAULT 0,
  `file_uploads` tinyint(1) DEFAULT 0,
  `priority_support` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subscription_plans`
--

INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `yearly_price`, `form_limit`, `submission_limit_monthly`, `custom_redirect`, `file_uploads`, `priority_support`) VALUES
(1, 'free', 0.00, 0.00, 3, 100, 0, 0, 0),
(2, 'pro', 9.99, 99.99, 20, 5000, 1, 1, 0),
(3, 'enterprise', 29.99, 299.99, 100, 50000, 1, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `subscription_tier` enum('free','pro','enterprise') DEFAULT 'free',
  `subscription_id` varchar(255) DEFAULT NULL,
  `subscription_status` enum('none','active','pending','cancelled','halted') DEFAULT 'none',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `plan_id` int(11) DEFAULT NULL,
  `subscription_start_date` datetime DEFAULT NULL,
  `subscription_end_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `name`, `subscription_tier`, `subscription_id`, `subscription_status`, `created_at`, `updated_at`, `plan_id`, `subscription_start_date`, `subscription_end_date`) VALUES
(1, 'cabozadin@mailinator.com', '$2b$10$5z.Y.1YsNDjaMRKFxBVR3On6eB6qQpyBpXAl7G6l41rMlp5CP02V6', 'Tana Lowery', 'free', NULL, 'none', '2025-05-17 09:14:59', '2025-05-17 09:14:59', NULL, NULL, NULL),
(2, 'hazewaxy@mailinator.com', '$2b$10$ditQB.E0uguQ5/Uf9ttzZOJJgq0XB.LSTDRC.9ML2oZFEAR1Y0dXi', 'Ivy Lindsey', 'free', NULL, 'none', '2025-05-17 09:21:10', '2025-05-17 09:21:10', NULL, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `forms`
--
ALTER TABLE `forms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `endpoint_id` (`endpoint_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `form_fields`
--
ALTER TABLE `form_fields`
  ADD PRIMARY KEY (`id`),
  ADD KEY `form_id` (`form_id`);

--
-- Indexes for table `submissions`
--
ALTER TABLE `submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `form_id` (`form_id`);

--
-- Indexes for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `plan_id` (`plan_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `forms`
--
ALTER TABLE `forms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `form_fields`
--
ALTER TABLE `form_fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `forms`
--
ALTER TABLE `forms`
  ADD CONSTRAINT `forms_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `form_fields`
--
ALTER TABLE `form_fields`
  ADD CONSTRAINT `form_fields_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
