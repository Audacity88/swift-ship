import { Article } from '@/types/knowledge'

export const SHIPPING_ARTICLES: Article[] = [
  {
    id: 'shipping-rates-guide',
    title: 'Complete Guide to Shipping Rates and Services',
    content: `
# Understanding Our Shipping Rates and Services

Our shipping services are designed to meet various needs, from urgent deliveries to cost-effective solutions.

## Standard Shipping
- Delivery within 3-5 business days
- Most cost-effective option
- Available for packages up to 70 lbs
- Free tracking included

## Express Shipping
- Next-day delivery for most locations
- Available for urgent shipments
- Premium insurance included
- Real-time tracking updates

## International Shipping
- Delivery to over 200 countries
- Customs documentation assistance
- Multiple service levels available
- Full tracking capability

## Bulk Shipping
- Special rates for high-volume shippers
- Dedicated account manager
- Customized pickup schedules
- Volume discounts available

Contact our support team for specific rates and service availability in your area.
    `,
    category: 'shipping',
    tags: ['rates', 'services', 'international', 'express'],
    author: {
      id: 'system',
      name: 'System',
      email: 'system@example.com',
      role: 'system'
    },
    status: 'published',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    viewCount: 1250,
    rating: 4.8,
  },
  {
    id: 'packaging-guidelines',
    title: 'Packaging Guidelines for Safe Shipping',
    content: `
# How to Package Your Items Safely

Proper packaging is crucial for ensuring your items arrive safely at their destination.

## Essential Packaging Materials
- Strong corrugated boxes
- Bubble wrap or foam padding
- Packing tape (2-inch width recommended)
- Void fill material

## Step-by-Step Packaging Guide
1. Choose the right box size
2. Wrap items individually
3. Use adequate cushioning
4. Seal all seams with tape
5. Apply shipping labels clearly

## Special Items Packaging
- **Fragile Items**: Double-box with 3 inches of cushioning
- **Electronics**: Use anti-static materials
- **Liquids**: Use sealed containers and absorbent materials
- **Artwork**: Use corner protectors and "Fragile" labels

## Common Packaging Mistakes
- Using old boxes
- Insufficient cushioning
- Poor tape application
- Incorrect box size

Remember: Good packaging prevents damage and saves money on claims.
    `,
    category: 'shipping',
    tags: ['packaging', 'guidelines', 'safety', 'fragile'],
    author: {
      id: 'system',
      name: 'System',
      email: 'system@example.com',
      role: 'system'
    },
    status: 'published',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    viewCount: 890,
    rating: 4.9,
  },
  {
    id: 'international-customs',
    title: 'International Shipping: Customs Guide',
    content: `
# International Shipping and Customs Guide

Understanding customs requirements is essential for successful international shipping.

## Required Documentation
- Commercial Invoice
- Packing List
- Certificate of Origin (when required)
- Export Declaration
- Import License (if applicable)

## Prohibited Items
- Dangerous goods
- Perishable items
- Currency
- Precious metals
- Restricted medications

## Customs Clearance Process
1. Documentation review
2. Duty and tax assessment
3. Physical inspection (if required)
4. Release approval

## Tips for Smooth Customs Clearance
- Declare items accurately
- Include detailed descriptions
- Provide accurate values
- Follow country-specific regulations
- Keep copies of all documents

## Common Customs Delays
- Incomplete documentation
- Incorrect value declaration
- Missing licenses
- Prohibited items

Contact our international shipping specialists for assistance with specific countries.
    `,
    category: 'shipping',
    tags: ['international', 'customs', 'documentation', 'regulations'],
    author: {
      id: 'system',
      name: 'System',
      email: 'system@example.com',
      role: 'system'
    },
    status: 'published',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    viewCount: 750,
    rating: 4.7,
  },
  {
    id: 'tracking-guide',
    title: 'How to Track Your Shipment',
    content: `
# Complete Shipment Tracking Guide

Learn how to track your shipments and understand tracking statuses.

## Tracking Methods
- Online tracking portal
- Mobile app tracking
- Email notifications
- SMS updates

## Understanding Tracking Statuses
- **Label Created**: Shipment registered
- **Picked Up**: In our possession
- **In Transit**: Moving through network
- **Out for Delivery**: Final delivery attempt
- **Delivered**: Successfully delivered
- **Exception**: Delivery issue occurred

## Setting Up Notifications
1. Create an account
2. Add tracking numbers
3. Choose notification preferences
4. Select update frequency

## Advanced Tracking Features
- Signature verification
- Proof of delivery
- Delivery instructions
- Location mapping

## Troubleshooting
- No tracking updates
- Incorrect status
- Missing delivery
- Technical issues

Contact support if you need help understanding your tracking information.
    `,
    category: 'shipping',
    tags: ['tracking', 'delivery', 'notifications', 'status'],
    author: {
      id: 'system',
      name: 'System',
      email: 'system@example.com',
      role: 'system'
    },
    status: 'published',
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04'),
    viewCount: 1500,
    rating: 4.9,
  },
  {
    id: 'claims-process',
    title: 'Filing a Claim for Lost or Damaged Shipments',
    content: `
# Shipping Claims Process Guide

Learn how to file and process claims for lost or damaged shipments.

## When to File a Claim
- Missing packages
- Damaged contents
- Delayed delivery
- Wrong delivery location

## Required Documentation
- Tracking number
- Photos of damage
- Original invoice
- Packaging materials
- Inspection report (if applicable)

## Claims Process Steps
1. Report the issue immediately
2. Document the damage
3. Submit claim form
4. Provide supporting documents
5. Wait for claim review
6. Receive decision

## Claim Filing Tips
- File within 15 days
- Keep all original packaging
- Take detailed photos
- Save all receipts
- Document communication

## Common Claim Issues
- Late filing
- Insufficient documentation
- Improper packaging
- Missing information

Contact our claims department for assistance with your specific case.
    `,
    category: 'shipping',
    tags: ['claims', 'damage', 'lost packages', 'insurance'],
    author: {
      id: 'system',
      name: 'System',
      email: 'system@example.com',
      role: 'system'
    },
    status: 'published',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    viewCount: 680,
    rating: 4.6,
  }
] 