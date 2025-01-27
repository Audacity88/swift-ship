-- Insert initial categories
INSERT INTO categories (id, name, slug, description, created_at, updated_at)
VALUES 
  ('c1b1b1b1-1111-1111-1111-111111111111', 'Getting Started', 'getting-started', 'Learn the basics of using our shipping platform', NOW(), NOW()),
  ('c3b3b3b3-3333-3333-3333-333333333333', 'Tracking', 'tracking', 'Track and manage your shipments', NOW(), NOW()),
  ('c4b4b4b4-4444-4444-4444-444444444444', 'Account Settings', 'account-settings', 'Manage your account and preferences', NOW(), NOW()),
  ('c5b5b5b5-5555-5555-5555-555555555555', 'Troubleshooting', 'troubleshooting', 'Common issues and how to resolve them', NOW(), NOW());

-- Insert initial articles
INSERT INTO articles (id, title, slug, excerpt, content, category_id, author_id, status, created_at, updated_at)
VALUES
  -- Getting Started
  ('a1111111-1111-1111-1111-111111111111', 
   'Welcome to Swift Ship',
   'welcome-to-swift-ship',
   'Get started with Swift Ship and learn about our key features',
   '# Welcome to Swift Ship

Welcome to Swift Ship, your all-in-one shipping solution! This guide will help you get started with our platform and make the most of our features.

## Key Features

1. Easy Package Creation
2. Real-time Tracking
3. Multiple Carrier Support
4. Address Book Management
5. Automated Labels

## First Steps

1. Complete your profile
2. Add your first address
3. Create your first shipment
4. Track your package

Need help? Contact our support team!',
   'c1b1b1b1-1111-1111-1111-111111111111',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Shipping
  ('a2222222-2222-2222-2222-222222222222',
   'How to Create a New Shipment',
   'how-to-create-new-shipment',
   'Learn how to create and manage your shipments',
   '# Creating a New Shipment

Follow these steps to create your first shipment:

1. Click "New Shipment" in the dashboard
2. Enter package details
3. Choose your carrier
4. Print your label
5. Schedule pickup

## Package Details

- Weight
- Dimensions
- Contents
- Value

## Carrier Selection

Compare rates and delivery times across multiple carriers.',
   '9145394c-3e4e-40ea-9f5e-ea8efc40547d',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Tracking
  ('a3333333-3333-3333-3333-333333333333',
   'Understanding Tracking Updates',
   'understanding-tracking-updates',
   'Learn how to track your packages and understand status updates',
   '# Tracking Your Shipment

Learn how to interpret tracking updates and statuses:

## Common Statuses

- Label Created
- In Transit
- Out for Delivery
- Delivered
- Exception

## Tracking Features

- Real-time updates
- Email notifications
- SMS alerts
- Delivery estimates',
   'c3b3b3b3-3333-3333-3333-333333333333',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Account Settings
  ('a4444444-4444-4444-4444-444444444444',
   'Managing Your Account Settings',
   'managing-account-settings',
   'Complete guide to managing your account settings and security',
   '# Account Settings Guide

Learn how to manage your Swift Ship account:

## Profile Settings

- Personal Information
- Company Details
- Billing Information
- Notification Preferences

## Security

- Password Management
- Two-Factor Authentication
- API Keys
- Access Logs',
   'c4b4b4b4-4444-4444-4444-444444444444',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Troubleshooting
  ('a5555555-5555-5555-5555-555555555555',
   'Common Shipping Issues and Solutions',
   'common-shipping-issues-solutions',
   'Solutions for common shipping problems and issues',
   '# Troubleshooting Guide

Solutions for common shipping issues:

## Address Verification

- Invalid Addresses
- Missing Apartment Numbers
- Commercial vs Residential

## Label Problems

- Printing Issues
- Label Dimensions
- Barcode Scanning

## Tracking Issues

- Missing Updates
- Delayed Scans
- Exception Handling',
   'c5b5b5b5-5555-5555-5555-555555555555',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()); 