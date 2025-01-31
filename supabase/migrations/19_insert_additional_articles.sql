-- Insert additional articles for Getting Started category
INSERT INTO articles (id, title, slug, excerpt, content, category_id, author_id, status, created_at, updated_at)
VALUES
  -- Getting Started - Platform Overview
  ('a1111112-1111-1111-1111-111111111112',
   'Platform Overview',
   'platform-overview',
   'Get a comprehensive overview of our shipping platform',
   '# Platform Overview

Our shipping platform provides a comprehensive solution for all your shipping needs. Here''s what you need to know:

## Key Components

1. Dashboard
   - Quick overview of active shipments
   - Recent activity feed
   - Performance metrics

2. Shipping Tools
   - Label creation
   - Rate comparison
   - Bulk shipping options

3. Management Features
   - Address book
   - Package templates
   - Saved preferences

4. Reporting
   - Shipping history
   - Cost analysis
   - Delivery performance

## Platform Benefits

- Streamlined shipping process
- Cost savings through rate comparison
- Time-saving automation features
- Comprehensive tracking capabilities',
   'c1b1b1b1-1111-1111-1111-111111111111',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Getting Started - Creating Your First Shipment
  ('a1111113-1111-1111-1111-111111111113',
   'Creating Your First Shipment',
   'creating-your-first-shipment',
   'Step-by-step guide to creating your first shipment',
   '# Creating Your First Shipment

Follow this guide to create your first shipment on our platform.

## Prerequisites

1. Verified account
2. Shipping address
3. Package details

## Step-by-Step Guide

1. Log into your dashboard
2. Click "New Shipment"
3. Enter package details
4. Choose shipping method
5. Print label
6. Schedule pickup

## Tips for Success

- Double-check all addresses
- Measure package accurately
- Compare carrier rates
- Save templates for future use',
   'c1b1b1b1-1111-1111-1111-111111111111',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Shipping Methods
  ('a2222223-2222-2222-2222-222222222223',
   'Shipping Methods',
   'shipping-methods',
   'Learn about different shipping methods and when to use them',
   '# Shipping Methods Guide

Choose the right shipping method for your needs.

## Available Methods

1. Ground Shipping
   - Most economical
   - 1-5 business days
   - Best for non-urgent deliveries

2. Express Shipping
   - Next-day delivery
   - Premium service
   - Guaranteed delivery times

3. International Shipping
   - Multiple carrier options
   - Customs documentation
   - Tracking across borders

## Choosing the Right Method

Consider these factors:
- Urgency
- Budget
- Package size and weight
- Destination
- Special handling requirements',
   '9145394c-3e4e-40ea-9f5e-ea8efc40547d',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Shipping - Packaging Guidelines
  ('a2222224-2222-2222-2222-222222222224',
   'Packaging Guidelines',
   'packaging-guidelines',
   'Best practices for packaging your shipments',
   '# Packaging Guidelines

Proper packaging ensures your items arrive safely.

## Basic Principles

1. Choose the Right Box
   - Appropriate size
   - Strong materials
   - Good condition

2. Use Proper Cushioning
   - Bubble wrap
   - Packing peanuts
   - Air pillows

3. Seal Securely
   - Strong tape
   - H-pattern sealing
   - Reinforced edges

## Special Considerations

- Fragile items
- Liquids
- Electronics
- Perishables',
   '9145394c-3e4e-40ea-9f5e-ea8efc40547d',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Shipping - International Shipping
  ('a2222225-2222-2222-2222-222222222225',
   'International Shipping',
   'international-shipping',
   'Everything you need to know about international shipping',
   '# International Shipping Guide

Navigate the complexities of international shipping.

## Key Requirements

1. Documentation
   - Commercial invoice
   - Customs forms
   - Certificates of origin

2. Restrictions
   - Prohibited items
   - Size/weight limits
   - Value declarations

3. Customs & Duties
   - Import taxes
   - Customs fees
   - Duty calculations

## Best Practices

- Research destination requirements
- Use proper documentation
- Consider insurance
- Allow extra transit time',
   '9145394c-3e4e-40ea-9f5e-ea8efc40547d',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Tracking - Real-time Tracking
  ('a3333334-3333-3333-3333-333333333334',
   'Real-time Tracking',
   'real-time-tracking',
   'How to use our real-time tracking features',
   '# Real-time Tracking Guide

Stay updated on your shipment''s location and status.

## Tracking Features

1. Live Updates
   - GPS location
   - Status changes
   - Estimated delivery time

2. Notification Options
   - Email alerts
   - SMS updates
   - Mobile app notifications

3. Tracking Tools
   - Web dashboard
   - Mobile app
   - API integration

## Using the Tracking System

- Enter tracking number
- Set up notifications
- Share tracking info
- Monitor multiple shipments',
   'c3b3b3b3-3333-3333-3333-333333333333',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Tracking - Delivery Updates
  ('a3333335-3333-3333-3333-333333333335',
   'Delivery Updates',
   'delivery-updates',
   'Understanding delivery updates and notifications',
   '# Delivery Updates Guide

Learn about our delivery update system.

## Types of Updates

1. Status Changes
   - Picked up
   - In transit
   - Out for delivery
   - Delivered

2. Exception Updates
   - Delays
   - Failed attempts
   - Address issues

3. Proof of Delivery
   - Signature confirmation
   - Delivery photos
   - Timestamp verification

## Customizing Updates

- Choose notification methods
- Set update frequency
- Manage recipients
- Configure alerts',
   'c3b3b3b3-3333-3333-3333-333333333333',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Tracking - Lost Package Protocol
  ('a3333336-3333-3333-3333-333333333336',
   'Lost Package Protocol',
   'lost-package-protocol',
   'What to do if your package is lost',
   '# Lost Package Protocol

Steps to take when a package is missing.

## Initial Steps

1. Verify Status
   - Check tracking history
   - Confirm delivery attempts
   - Review address accuracy

2. Contact Support
   - Report missing package
   - Provide documentation
   - File claim if needed

3. Investigation Process
   - Carrier investigation
   - Location tracking
   - Package search

## Prevention Tips

- Use accurate addresses
- Add delivery instructions
- Consider insurance
- Choose signature required',
   'c3b3b3b3-3333-3333-3333-333333333333',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Account Settings - Profile Management
  ('a4444445-4444-4444-4444-444444444445',
   'Profile Management',
   'profile-management',
   'How to manage your account profile',
   '# Profile Management Guide

Keep your account information up to date.

## Profile Sections

1. Basic Information
   - Name and contact
   - Company details
   - Communication preferences

2. Shipping Preferences
   - Default address
   - Preferred carriers
   - Package templates

3. Security Settings
   - Password management
   - Two-factor authentication
   - Login history

## Best Practices

- Regular information updates
- Strong password usage
- Verified contact details
- Backup notification methods',
   'c4b4b4b4-4444-4444-4444-444444444444',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Account Settings - Notification Settings
  ('a4444446-4444-4444-4444-444444444446',
   'Notification Settings',
   'notification-settings',
   'Customize your notification preferences',
   '# Notification Settings Guide

Control how and when you receive updates.

## Notification Types

1. Shipment Updates
   - Status changes
   - Delivery alerts
   - Exception notifications

2. Account Alerts
   - Security notices
   - Billing updates
   - System maintenance

3. Marketing Communications
   - Promotions
   - New features
   - Service updates

## Configuration Options

- Choose channels (email/SMS/push)
- Set frequency
- Customize content
- Manage subscriptions',
   'c4b4b4b4-4444-4444-4444-444444444444',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Account Settings - Billing Information
  ('a4444447-4444-4444-4444-444444444447',
   'Billing Information',
   'billing-information',
   'Managing your billing details and payments',
   '# Billing Information Guide

Manage your payment methods and billing history.

## Billing Management

1. Payment Methods
   - Add/remove cards
   - Bank accounts
   - Payment preferences

2. Billing History
   - Invoice access
   - Payment records
   - Statement downloads

3. Billing Settings
   - Auto-pay setup
   - Invoice preferences
   - Tax information

## Security Measures

- Encrypted storage
- Secure transactions
- Fraud protection
- Payment verification',
   'c4b4b4b4-4444-4444-4444-444444444444',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Troubleshooting - Common Issues
  ('a5555556-5555-5555-5555-555555555556',
   'Common Issues',
   'common-issues',
   'Solutions for frequently encountered problems',
   '# Common Issues Guide

Quick solutions for common shipping problems.

## Frequent Issues

1. Label Problems
   - Printing errors
   - Barcode issues
   - Label placement

2. Address Verification
   - Invalid addresses
   - Missing information
   - Format problems

3. Tracking Issues
   - Missing updates
   - Incorrect status
   - Sync problems

## Quick Fixes

- Troubleshooting steps
- Self-service solutions
- When to contact support',
   'c5b5b5b5-5555-5555-5555-555555555555',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Troubleshooting - Error Messages
  ('a5555557-5555-5555-5555-555555555557',
   'Error Messages',
   'error-messages',
   'Understanding and resolving error messages',
   '# Error Messages Guide

Decode and resolve common error messages.

## Common Errors

1. System Errors
   - Connection issues
   - Timeout errors
   - Database errors

2. Validation Errors
   - Input problems
   - Missing fields
   - Format issues

3. Authorization Errors
   - Login problems
   - Permission issues
   - Session expiration

## Resolution Steps

- Error identification
- Quick fixes
- Prevention tips
- Support escalation',
   'c5b5b5b5-5555-5555-5555-555555555555',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()),

  -- Troubleshooting - Contact Support
  ('a5555558-5555-5555-5555-555555555558',
   'Contact Support',
   'contact-support',
   'How to get help from our support team',
   '# Contact Support Guide

Learn how to get help when you need it.

## Support Channels

1. Online Support
   - Help center
   - Live chat
   - Email support

2. Phone Support
   - Support hours
   - Priority lines
   - Call routing

3. Ticket System
   - Creating tickets
   - Tracking progress
   - Following up

## Best Practices

- Provide clear information
- Include relevant details
- Follow up appropriately
- Use proper channels',
   'c5b5b5b5-5555-5555-5555-555555555555',
   (SELECT id FROM agents WHERE role = 'admin' LIMIT 1),
   'published',
   NOW(),
   NOW()); 