-- Migration 023: Expand project element types
-- Adds 13 new element types for comprehensive landscaping coverage.

ALTER TABLE project_elements DROP CONSTRAINT IF EXISTS project_elements_element_type_check;
ALTER TABLE project_elements ADD CONSTRAINT project_elements_element_type_check
  CHECK (element_type IN (
    'patio', 'wall', 'garden_bed', 'sod_area', 'edging', 'walkway',
    'driveway', 'retaining_wall', 'fire_pit', 'pool_deck',
    'parking_lot', 'steps_stairs', 'fence', 'pergola', 'outdoor_kitchen',
    'drainage', 'tree_planting', 'shrub_planting', 'irrigation_zone',
    'mulch_area', 'gravel_area', 'concrete_slab', 'curbing',
    'other'
  ));
