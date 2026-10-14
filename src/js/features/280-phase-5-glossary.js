/* ================================================================== Phase 5: glossary
 * Data model (exactly the user's schema):
 *   terms[]:       { id, term, acronym, clouds[gcp|azure|aws|neutral], exams[], domains[], definition, aliases[], related[], source_section }
 *   cross_cloud[]: { function, gcp, azure, aws, notes }
 * The seed (GLOSSARY_SEED) is built from the Certification Glossary doc and embedded at build time.
 * User additions or edits arrive by import and live in S.ws.glossary, so they travel in the workspace file.
 * Merged view: seed overlaid by S.ws.glossary (terms by id, cross rows by function). IDs are never rewritten.
 */
