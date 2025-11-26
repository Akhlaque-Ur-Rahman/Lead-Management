# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-11-26

### Added
- Company activation/deactivation functionality for Platform Admins and Super Admins
- `deactivatedByCompany` field to user management system
- Automatic user status management when companies are activated/deactivated
- Enhanced batch user operations for company-wide status changes
- Auto-sync functionality between company and user status changes

### Fixed
- **Critical**: Pagination now shows correct total page count for large datasets (200+ leads)
- **Critical**: Fixed pagination showing only 1 page despite having hundreds of leads
- Firestore query optimization to avoid composite index requirements
- Lead Pool filtering with proper total count calculation
- Authentication flow for company-deactivated users

### Changed
- Removed Firestore composite index dependencies for better performance
- Implemented client-side sorting by `createdAt` for leads
- Enhanced error handling and console logging for pagination
- Improved Lead Pool filtering with hybrid server/client-side approach
- Optimized Firestore read costs by avoiding aggregation queries

### Technical Details
- Modified `AuthContext.tsx` to handle `deactivatedByCompany` field
- Updated `CompanyContext.tsx` with auto-sync user status functionality
- Enhanced `LeadsContext.tsx` with proper pagination count logic
- Removed `orderBy` constraints to avoid Firestore index requirements
- Added count query on first page load for accurate total leads count

## [1.1.0] - Previous Release

### Added
- Cursor-based pagination for efficient data loading
- Hybrid filtering strategy for Lead Pool management
- Excel import/export with validation
- Export restrictions for security

### Technical
- Server-side pagination using Firestore's `startAfter` and `limit`
- PaginationControls component with page size selection
- Auto-refresh after lead import

---

## Support

For questions about these changes or issues with the application, please contact the development team.

### Version History
- **v1.2.0**: Company management & pagination fixes (Nov 2025)
- **v1.1.0**: Pagination implementation and lead management features
- **v1.0.0**: Initial release with basic lead management functionality