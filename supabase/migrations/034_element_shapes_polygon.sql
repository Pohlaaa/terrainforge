-- Migration 034: extend shape CHECK to allow 'polygon'
--
-- Mig 033 added shape with CHECK IN ('rectangle','circle','polyline'). We
-- meant 'polyline' as a placeholder for polygon support, but the actual
-- rendering type (ElementGeometry.shape.kind) uses 'polygon'. Keep both
-- enum values so legacy 'polyline' rows don't break, and add 'polygon'
-- as the canonical name going forward.
--
-- Engine reads geometry.shape.points for shape='polygon' and computes area
-- via the Shoelace formula (src/materials-engine/unit-conversions.ts
-- polygonAreaSqft). Linear computation uses segment-sum perimeter.

ALTER TABLE project_elements
  DROP CONSTRAINT IF EXISTS project_elements_shape_check;

ALTER TABLE project_elements
  ADD CONSTRAINT project_elements_shape_check
  CHECK (shape IN ('rectangle', 'circle', 'polygon', 'polyline'));

COMMENT ON COLUMN project_elements.shape IS
  'Geometric shape for area calculation. ''rectangle'' uses length_ft × width_ft (default). ''circle'' uses π × radius_ft². ''polygon'' uses Shoelace formula on geometry.shape.points. ''polyline'' is reserved.';
