# DailyBudget App Architecture

## Overview

DailyBudget is a simple budgeting and lightweight business bookkeeping app.

The app is designed for:

- families
- couples
- immigrants
- freelancers
- small business owners
- non-technical users

Main goals:

- personal budgeting
- business expense tracking
- tax preparation support
- simple reporting
- easy user experience

The app is intentionally designed to stay simpler than full accounting software like QuickBooks.

---

# Frontend Stack

- Expo Router
- React Native
- TypeScript

---

# Backend Stack

- Firebase Authentication
- Firestore Database

---

# Main App Features

## Authentication

- Email/password login
- Google login
- Apple login architecture (in progress)

---

## Family System

Each user belongs to a family.

Families contain:

- members
- invitations
- entries
- budget areas
- categories

---

## Budget Areas

Budget Areas are high-level financial sections.

Examples:

- Daily Life
- My Business
- Rental Property

Each family can create custom budget areas.

---

## Categories

Categories belong to budget areas.

Examples:

- Grocery
- Gas
- Advertising
- Supplies

Each family can:

- create categories
- rename categories
- archive categories

---

## Entries

Entries are financial transactions.

Entry kinds:

- expense
- income
- refund
- cashback
- transfer

---

# Main Project Folders

## app

Contains screens and routes.

Examples:

- login
- dashboard
- settings
- family setup

---

## components

Reusable UI components.

Examples:

- buttons
- forms
- dropdowns
- cards

---

## services

Backend and Firebase logic.

Examples:

- authentication
- Google login
- Firestore seeding

---

## models

TypeScript interfaces and shared types.

---

## constants

Shared default/static data.

Examples:

- default budget areas
- default categories

---

## docs

Project documentation.

---

# Important Architecture Rules

- Avoid hardcoded categories
- Prefer reusable components
- Use centralized constants
- Standardize styling
- Never hard delete categories or budget areas
- Use:
  isArchived: true

---

# Long-Term Vision

The app should eventually support:

- recurring subscriptions
- monthly reports
- tax reports
- CPA exports
- business summaries
- profit/loss reports

while remaining simple and easy to use.
