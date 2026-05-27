# Collections

## budgetAreas

Fields:

- id
- familyId
- name
- isArchived
- createdBy
- createdAt

## categories

Fields:

- id
- familyId
- budgetAreaId
- name
- type
- isArchived
- createdBy
- createdAt

Category types:

- expense
- income
- refund
- cashback

## entries

Fields:

- id
- familyId
- userId
- amount
- budgetAreaId
- categoryId
- type
- note
- date
- createdAt
