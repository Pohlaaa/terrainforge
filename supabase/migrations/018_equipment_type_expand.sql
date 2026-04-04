-- Migration 018: Expand equipment_type CHECK constraint
-- The original constraint (014) only allowed 9 slug-style values.
-- With the comprehensive equipment knowledge base (250+ models, 75+ types),
-- we need to allow all human-readable equipment type names.
-- Using a broad allowlist grouped by category.

ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_type_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_type_check CHECK (
  equipment_type IS NULL OR equipment_type IN (
    -- Original values (backward compat)
    'excavator', 'mini-excavator', 'skid-steer', 'mini-skid-steer',
    'tractor', 'dump-truck', 'trailer', 'pickup-truck', 'other',

    -- Excavators
    'Excavator', 'Mini Excavator', 'Compact Excavator', 'Micro Excavator',
    'Tight Tail Excavator',

    -- Loaders
    'Skid Steer Loader', 'Compact Track Loader', 'Compact Wheel Loader',
    'All-Wheel Steer Loader', 'Mini Track Loader', 'Mini Skid Steer',
    'Stand-On Skid Steer', 'Compact Utility Loader',

    -- Backhoes & Dozers
    'Backhoe Loader', 'Small Dozer', 'Medium Dozer',

    -- Tractors
    'Compact Tractor', 'Sub-Compact Tractor', 'Sub-Compact Tractor/Backhoe',

    -- Mowers
    'Zero-Turn Mower', 'Stand-On Mower', 'Walk-Behind Mower', 'Robotic Mower',

    -- Trenching & Drilling
    'Walk-Behind Trencher', 'Ride-On Trencher', 'Directional Drill',
    'Vibratory Plow',

    -- Chainsaws & Handheld Power
    'Chainsaw', 'String Trimmer', 'Brushcutter', 'Clearing Saw',
    'Backpack Blower', 'Handheld Blower', 'Hedge Trimmer',
    'Pole Pruner', 'Cut-Off Saw', 'Earth Auger', 'Shredder Vac',
    'Bed Redefiner', 'Power Cutter',

    -- Compaction
    'Rammer/Compactor', 'Vibratory Plate', 'Reversible Plate Compactor',
    'Ride-On Roller',

    -- Stump & Brush
    'Stump Cutter', 'Stump Grinder', 'Brush Chipper',

    -- Concrete & Masonry
    'Concrete Mixer', 'Mortar Mixer', 'Masonry Saw', 'Block Saw', 'Floor Saw',

    -- Trailers
    'Landscape Trailer', 'Equipment Trailer', 'Dump Trailer',
    'Single Axle Trailer',

    -- Trucks
    'Work Truck', 'Dump Truck', 'Landscape Truck',

    -- Pressure Washers
    'Pressure Washer', 'Hot Water Pressure Washer',

    -- Generators & Compressors
    'Portable Generator', 'Generator', 'Air Compressor', 'Towable Air Compressor',

    -- Water
    'Water Pump', 'Trash Pump',

    -- Irrigation
    'Rotor Sprinkler Head', 'Irrigation Controller', 'WiFi Irrigation Controller',
    'Drip Irrigation',

    -- Lighting
    'Landscape Lighting Kit',

    -- Utility & Specialty
    'Utility Vehicle', 'Utility Work Machine', 'Demolition Robot'
  )
);
