/**
 * Equipment Knowledge Base
 * Comprehensive landscaping equipment catalog with models, types, and typical hourly rates
 * Used by onboarding and equipment quick-add features
 */

export interface EquipmentTemplate {
  make: string;
  model: string;
  type: string;
  typicalHourlyRate: number;
}

export const EQUIPMENT_KNOWLEDGE: EquipmentTemplate[] = [
  // ── Bobcat ──────────────────────────────────────────────────────
  { make: 'Bobcat', model: 'S450', type: 'Skid Steer Loader', typicalHourlyRate: 65 },
  { make: 'Bobcat', model: 'S510', type: 'Skid Steer Loader', typicalHourlyRate: 70 },
  { make: 'Bobcat', model: 'S570', type: 'Skid Steer Loader', typicalHourlyRate: 75 },
  { make: 'Bobcat', model: 'S590', type: 'Skid Steer Loader', typicalHourlyRate: 78 },
  { make: 'Bobcat', model: 'S630', type: 'Skid Steer Loader', typicalHourlyRate: 80 },
  { make: 'Bobcat', model: 'S650', type: 'Skid Steer Loader', typicalHourlyRate: 85 },
  { make: 'Bobcat', model: 'S770', type: 'Skid Steer Loader', typicalHourlyRate: 90 },
  { make: 'Bobcat', model: 'S850', type: 'Skid Steer Loader', typicalHourlyRate: 95 },
  { make: 'Bobcat', model: 'T450', type: 'Compact Track Loader', typicalHourlyRate: 75 },
  { make: 'Bobcat', model: 'T550', type: 'Compact Track Loader', typicalHourlyRate: 80 },
  { make: 'Bobcat', model: 'T595', type: 'Compact Track Loader', typicalHourlyRate: 85 },
  { make: 'Bobcat', model: 'T650', type: 'Compact Track Loader', typicalHourlyRate: 95 },
  { make: 'Bobcat', model: 'T770', type: 'Compact Track Loader', typicalHourlyRate: 100 },
  { make: 'Bobcat', model: 'T870', type: 'Compact Track Loader', typicalHourlyRate: 110 },
  { make: 'Bobcat', model: 'A770', type: 'All-Wheel Steer Loader', typicalHourlyRate: 85 },
  { make: 'Bobcat', model: 'E10', type: 'Mini Excavator', typicalHourlyRate: 35 },
  { make: 'Bobcat', model: 'E20', type: 'Mini Excavator', typicalHourlyRate: 40 },
  { make: 'Bobcat', model: 'E32', type: 'Mini Excavator', typicalHourlyRate: 50 },
  { make: 'Bobcat', model: 'E35', type: 'Mini Excavator', typicalHourlyRate: 55 },
  { make: 'Bobcat', model: 'E42', type: 'Mini Excavator', typicalHourlyRate: 60 },
  { make: 'Bobcat', model: 'E50', type: 'Mini Excavator', typicalHourlyRate: 65 },
  { make: 'Bobcat', model: 'E55', type: 'Compact Excavator', typicalHourlyRate: 70 },
  { make: 'Bobcat', model: 'E85', type: 'Compact Excavator', typicalHourlyRate: 80 },
  { make: 'Bobcat', model: 'MT100', type: 'Mini Track Loader', typicalHourlyRate: 40 },
  { make: 'Bobcat', model: 'CT2040', type: 'Compact Tractor', typicalHourlyRate: 45 },
  { make: 'Bobcat', model: 'UW56', type: 'Utility Vehicle', typicalHourlyRate: 30 },
  { make: 'Bobcat', model: 'Toolcat 5600', type: 'Utility Work Machine', typicalHourlyRate: 55 },

  // ── CAT (Caterpillar) ──────────────────────────────────────────
  { make: 'CAT', model: '226D3', type: 'Skid Steer Loader', typicalHourlyRate: 75 },
  { make: 'CAT', model: '242D3', type: 'Skid Steer Loader', typicalHourlyRate: 80 },
  { make: 'CAT', model: '262D3', type: 'Skid Steer Loader', typicalHourlyRate: 90 },
  { make: 'CAT', model: '272D3', type: 'Skid Steer Loader', typicalHourlyRate: 95 },
  { make: 'CAT', model: '239D3', type: 'Compact Track Loader', typicalHourlyRate: 85 },
  { make: 'CAT', model: '249D3', type: 'Compact Track Loader', typicalHourlyRate: 90 },
  { make: 'CAT', model: '259D3', type: 'Compact Track Loader', typicalHourlyRate: 95 },
  { make: 'CAT', model: '279D3', type: 'Compact Track Loader', typicalHourlyRate: 105 },
  { make: 'CAT', model: '289D3', type: 'Compact Track Loader', typicalHourlyRate: 110 },
  { make: 'CAT', model: '300.9D', type: 'Mini Excavator', typicalHourlyRate: 35 },
  { make: 'CAT', model: '301.7 CR', type: 'Mini Excavator', typicalHourlyRate: 40 },
  { make: 'CAT', model: '303 CR', type: 'Mini Excavator', typicalHourlyRate: 50 },
  { make: 'CAT', model: '304 CR', type: 'Mini Excavator', typicalHourlyRate: 55 },
  { make: 'CAT', model: '305 CR', type: 'Mini Excavator', typicalHourlyRate: 60 },
  { make: 'CAT', model: '308 CR', type: 'Compact Excavator', typicalHourlyRate: 75 },
  { make: 'CAT', model: '310', type: 'Compact Excavator', typicalHourlyRate: 80 },
  { make: 'CAT', model: '320', type: 'Excavator', typicalHourlyRate: 95 },
  { make: 'CAT', model: '420F2', type: 'Backhoe Loader', typicalHourlyRate: 65 },
  { make: 'CAT', model: '430F2', type: 'Backhoe Loader', typicalHourlyRate: 70 },
  { make: 'CAT', model: 'D3K2', type: 'Small Dozer', typicalHourlyRate: 85 },
  { make: 'CAT', model: 'D5K2', type: 'Medium Dozer', typicalHourlyRate: 100 },
  { make: 'CAT', model: '906M', type: 'Compact Wheel Loader', typicalHourlyRate: 65 },
  { make: 'CAT', model: '908M', type: 'Compact Wheel Loader', typicalHourlyRate: 70 },

  // ── John Deere ──────────────────────────────────────────────────
  { make: 'John Deere', model: '17G', type: 'Mini Excavator', typicalHourlyRate: 35 },
  { make: 'John Deere', model: '26G', type: 'Mini Excavator', typicalHourlyRate: 40 },
  { make: 'John Deere', model: '30G', type: 'Mini Excavator', typicalHourlyRate: 45 },
  { make: 'John Deere', model: '35G', type: 'Mini Excavator', typicalHourlyRate: 50 },
  { make: 'John Deere', model: '50G', type: 'Compact Excavator', typicalHourlyRate: 60 },
  { make: 'John Deere', model: '60G', type: 'Compact Excavator', typicalHourlyRate: 70 },
  { make: 'John Deere', model: '75G', type: 'Compact Excavator', typicalHourlyRate: 80 },
  { make: 'John Deere', model: '85G', type: 'Compact Excavator', typicalHourlyRate: 85 },
  { make: 'John Deere', model: '204L', type: 'Compact Wheel Loader', typicalHourlyRate: 55 },
  { make: 'John Deere', model: '244L', type: 'Compact Wheel Loader', typicalHourlyRate: 60 },
  { make: 'John Deere', model: '314G', type: 'Skid Steer Loader', typicalHourlyRate: 70 },
  { make: 'John Deere', model: '318G', type: 'Skid Steer Loader', typicalHourlyRate: 75 },
  { make: 'John Deere', model: '320G', type: 'Skid Steer Loader', typicalHourlyRate: 80 },
  { make: 'John Deere', model: '325G', type: 'Skid Steer Loader', typicalHourlyRate: 85 },
  { make: 'John Deere', model: '331G', type: 'Compact Track Loader', typicalHourlyRate: 90 },
  { make: 'John Deere', model: '333G', type: 'Compact Track Loader', typicalHourlyRate: 95 },
  { make: 'John Deere', model: '310E', type: 'Backhoe Loader', typicalHourlyRate: 60 },
  { make: 'John Deere', model: '310SL', type: 'Backhoe Loader', typicalHourlyRate: 65 },
  { make: 'John Deere', model: '450K', type: 'Small Dozer', typicalHourlyRate: 80 },
  { make: 'John Deere', model: '1023E', type: 'Sub-Compact Tractor', typicalHourlyRate: 30 },
  { make: 'John Deere', model: '2025R', type: 'Sub-Compact Tractor', typicalHourlyRate: 35 },
  { make: 'John Deere', model: '3025E', type: 'Compact Tractor', typicalHourlyRate: 40 },
  { make: 'John Deere', model: '3038E', type: 'Compact Tractor', typicalHourlyRate: 42 },
  { make: 'John Deere', model: '4044M', type: 'Compact Tractor', typicalHourlyRate: 45 },
  { make: 'John Deere', model: 'Z915E', type: 'Zero-Turn Mower', typicalHourlyRate: 35 },
  { make: 'John Deere', model: 'Z930M', type: 'Zero-Turn Mower', typicalHourlyRate: 40 },
  { make: 'John Deere', model: 'Z950M', type: 'Zero-Turn Mower', typicalHourlyRate: 45 },
  { make: 'John Deere', model: 'Z970R', type: 'Zero-Turn Mower', typicalHourlyRate: 50 },
  { make: 'John Deere', model: 'W48R', type: 'Walk-Behind Mower', typicalHourlyRate: 15 },
  { make: 'John Deere', model: 'Gator XUV835M', type: 'Utility Vehicle', typicalHourlyRate: 30 },

  // ── Kubota ─────────────────────────────────────────────────────
  { make: 'Kubota', model: 'K008-3', type: 'Micro Excavator', typicalHourlyRate: 30 },
  { make: 'Kubota', model: 'KX016-4', type: 'Mini Excavator', typicalHourlyRate: 40 },
  { make: 'Kubota', model: 'KX018-4', type: 'Mini Excavator', typicalHourlyRate: 42 },
  { make: 'Kubota', model: 'KX033-4', type: 'Mini Excavator', typicalHourlyRate: 50 },
  { make: 'Kubota', model: 'KX040-4', type: 'Mini Excavator', typicalHourlyRate: 55 },
  { make: 'Kubota', model: 'KX057-5', type: 'Compact Excavator', typicalHourlyRate: 65 },
  { make: 'Kubota', model: 'KX080-4', type: 'Compact Excavator', typicalHourlyRate: 75 },
  { make: 'Kubota', model: 'KX091-3', type: 'Mini Excavator', typicalHourlyRate: 60 },
  { make: 'Kubota', model: 'U35-4', type: 'Tight Tail Excavator', typicalHourlyRate: 55 },
  { make: 'Kubota', model: 'U55-4', type: 'Tight Tail Excavator', typicalHourlyRate: 65 },
  { make: 'Kubota', model: 'SSV65', type: 'Skid Steer Loader', typicalHourlyRate: 70 },
  { make: 'Kubota', model: 'SSV75', type: 'Skid Steer Loader', typicalHourlyRate: 80 },
  { make: 'Kubota', model: 'SVL65-2', type: 'Compact Track Loader', typicalHourlyRate: 80 },
  { make: 'Kubota', model: 'SVL75-2', type: 'Compact Track Loader', typicalHourlyRate: 85 },
  { make: 'Kubota', model: 'SVL95-2S', type: 'Compact Track Loader', typicalHourlyRate: 95 },
  { make: 'Kubota', model: 'SVL97-2', type: 'Compact Track Loader', typicalHourlyRate: 100 },
  { make: 'Kubota', model: 'BX2680', type: 'Sub-Compact Tractor', typicalHourlyRate: 30 },
  { make: 'Kubota', model: 'BX23S', type: 'Sub-Compact Tractor/Backhoe', typicalHourlyRate: 35 },
  { make: 'Kubota', model: 'L2501', type: 'Compact Tractor', typicalHourlyRate: 38 },
  { make: 'Kubota', model: 'L3901', type: 'Compact Tractor', typicalHourlyRate: 42 },
  { make: 'Kubota', model: 'L4701', type: 'Compact Tractor', typicalHourlyRate: 48 },
  { make: 'Kubota', model: 'Z421KW', type: 'Zero-Turn Mower', typicalHourlyRate: 35 },
  { make: 'Kubota', model: 'Z726XKW', type: 'Zero-Turn Mower', typicalHourlyRate: 45 },
  { make: 'Kubota', model: 'RTV-X900', type: 'Utility Vehicle', typicalHourlyRate: 28 },
  { make: 'Kubota', model: 'RTV-X1140', type: 'Utility Vehicle', typicalHourlyRate: 32 },

  // ── Husqvarna ──────────────────────────────────────────────────
  { make: 'Husqvarna', model: 'Z254F', type: 'Zero-Turn Mower', typicalHourlyRate: 30 },
  { make: 'Husqvarna', model: 'Z460', type: 'Zero-Turn Mower', typicalHourlyRate: 38 },
  { make: 'Husqvarna', model: 'Z548', type: 'Zero-Turn Mower', typicalHourlyRate: 42 },
  { make: 'Husqvarna', model: 'Z554', type: 'Zero-Turn Mower', typicalHourlyRate: 44 },
  { make: 'Husqvarna', model: 'Z556', type: 'Zero-Turn Mower', typicalHourlyRate: 45 },
  { make: 'Husqvarna', model: 'Z560', type: 'Zero-Turn Mower', typicalHourlyRate: 48 },
  { make: 'Husqvarna', model: 'MZ54', type: 'Zero-Turn Mower', typicalHourlyRate: 35 },
  { make: 'Husqvarna', model: '455 Rancher', type: 'Chainsaw', typicalHourlyRate: 8 },
  { make: 'Husqvarna', model: '372 XP', type: 'Chainsaw', typicalHourlyRate: 10 },
  { make: 'Husqvarna', model: '545 Mark II', type: 'Chainsaw', typicalHourlyRate: 9 },
  { make: 'Husqvarna', model: '562 XP', type: 'Chainsaw', typicalHourlyRate: 12 },
  { make: 'Husqvarna', model: '525LST', type: 'String Trimmer', typicalHourlyRate: 5 },
  { make: 'Husqvarna', model: '535LS', type: 'String Trimmer', typicalHourlyRate: 6 },
  { make: 'Husqvarna', model: '550iBTX', type: 'Backpack Blower', typicalHourlyRate: 5 },
  { make: 'Husqvarna', model: '580BTS', type: 'Backpack Blower', typicalHourlyRate: 6 },
  { make: 'Husqvarna', model: '226HD75S', type: 'Hedge Trimmer', typicalHourlyRate: 5 },
  { make: 'Husqvarna', model: 'DXR 140', type: 'Demolition Robot', typicalHourlyRate: 120 },
  { make: 'Husqvarna', model: 'Automower 450X', type: 'Robotic Mower', typicalHourlyRate: 8 },

  // ── STIHL ──────────────────────────────────────────────────────
  { make: 'STIHL', model: 'MS 170', type: 'Chainsaw', typicalHourlyRate: 4 },
  { make: 'STIHL', model: 'MS 250', type: 'Chainsaw', typicalHourlyRate: 6 },
  { make: 'STIHL', model: 'MS 271', type: 'Chainsaw', typicalHourlyRate: 7 },
  { make: 'STIHL', model: 'MS 362 C-M', type: 'Chainsaw', typicalHourlyRate: 10 },
  { make: 'STIHL', model: 'MS 500i', type: 'Chainsaw', typicalHourlyRate: 14 },
  { make: 'STIHL', model: 'FS 91 R', type: 'String Trimmer', typicalHourlyRate: 5 },
  { make: 'STIHL', model: 'FS 111 RX', type: 'String Trimmer', typicalHourlyRate: 6 },
  { make: 'STIHL', model: 'FS 131 R', type: 'Brushcutter', typicalHourlyRate: 7 },
  { make: 'STIHL', model: 'FS 240', type: 'Clearing Saw', typicalHourlyRate: 8 },
  { make: 'STIHL', model: 'BR 450 C-EF', type: 'Backpack Blower', typicalHourlyRate: 5 },
  { make: 'STIHL', model: 'BR 600', type: 'Backpack Blower', typicalHourlyRate: 6 },
  { make: 'STIHL', model: 'BR 800 C-E', type: 'Backpack Blower', typicalHourlyRate: 7 },
  { make: 'STIHL', model: 'BG 86', type: 'Handheld Blower', typicalHourlyRate: 3 },
  { make: 'STIHL', model: 'HS 82 R', type: 'Hedge Trimmer', typicalHourlyRate: 5 },
  { make: 'STIHL', model: 'HS 87 R', type: 'Hedge Trimmer', typicalHourlyRate: 6 },
  { make: 'STIHL', model: 'HT 135', type: 'Pole Pruner', typicalHourlyRate: 6 },
  { make: 'STIHL', model: 'TS 500i', type: 'Cut-Off Saw', typicalHourlyRate: 12 },
  { make: 'STIHL', model: 'TS 800', type: 'Cut-Off Saw', typicalHourlyRate: 15 },
  { make: 'STIHL', model: 'RB 400', type: 'Pressure Washer', typicalHourlyRate: 10 },
  { make: 'STIHL', model: 'RB 600', type: 'Pressure Washer', typicalHourlyRate: 12 },
  { make: 'STIHL', model: 'BT 131', type: 'Earth Auger', typicalHourlyRate: 8 },
  { make: 'STIHL', model: 'SH 86 C-E', type: 'Shredder Vac', typicalHourlyRate: 4 },

  // ── Toro ───────────────────────────────────────────────────────
  { make: 'Toro', model: 'Z Master 3000', type: 'Zero-Turn Mower', typicalHourlyRate: 40 },
  { make: 'Toro', model: 'Z Master 5000', type: 'Zero-Turn Mower', typicalHourlyRate: 50 },
  { make: 'Toro', model: 'Z Master 7500-D', type: 'Zero-Turn Mower', typicalHourlyRate: 55 },
  { make: 'Toro', model: 'Grandstand', type: 'Stand-On Mower', typicalHourlyRate: 38 },
  { make: 'Toro', model: 'TimeCutter MX5050', type: 'Zero-Turn Mower', typicalHourlyRate: 30 },
  { make: 'Toro', model: 'Turbo Force 48', type: 'Walk-Behind Mower', typicalHourlyRate: 18 },
  { make: 'Toro', model: 'TRX-26', type: 'Walk-Behind Trencher', typicalHourlyRate: 45 },
  { make: 'Toro', model: 'TX 1000', type: 'Compact Utility Loader', typicalHourlyRate: 55 },
  { make: 'Toro', model: 'TX 525', type: 'Compact Utility Loader', typicalHourlyRate: 45 },
  { make: 'Toro', model: 'Dingo TXL 2000', type: 'Compact Utility Loader', typicalHourlyRate: 60 },
  { make: 'Toro', model: 'Dingo TX 427', type: 'Compact Utility Loader', typicalHourlyRate: 40 },
  { make: 'Toro', model: 'Pro Sneak 360', type: 'Vibratory Plow', typicalHourlyRate: 50 },
  { make: 'Toro', model: 'STX-26', type: 'Stump Grinder', typicalHourlyRate: 55 },

  // ── Ditch Witch ────────────────────────────────────────────────
  { make: 'Ditch Witch', model: 'C12X', type: 'Walk-Behind Trencher', typicalHourlyRate: 30 },
  { make: 'Ditch Witch', model: 'C16X', type: 'Walk-Behind Trencher', typicalHourlyRate: 35 },
  { make: 'Ditch Witch', model: 'RT20', type: 'Walk-Behind Trencher', typicalHourlyRate: 38 },
  { make: 'Ditch Witch', model: 'RT40', type: 'Walk-Behind Trencher', typicalHourlyRate: 45 },
  { make: 'Ditch Witch', model: 'RT45', type: 'Ride-On Trencher', typicalHourlyRate: 55 },
  { make: 'Ditch Witch', model: 'RT80Q', type: 'Ride-On Trencher', typicalHourlyRate: 70 },
  { make: 'Ditch Witch', model: 'SK600', type: 'Mini Skid Steer', typicalHourlyRate: 45 },
  { make: 'Ditch Witch', model: 'SK800', type: 'Mini Skid Steer', typicalHourlyRate: 50 },
  { make: 'Ditch Witch', model: 'SK1050', type: 'Mini Skid Steer', typicalHourlyRate: 55 },
  { make: 'Ditch Witch', model: 'SK3000', type: 'Stand-On Skid Steer', typicalHourlyRate: 65 },
  { make: 'Ditch Witch', model: 'JT2720', type: 'Directional Drill', typicalHourlyRate: 85 },
  { make: 'Ditch Witch', model: 'JT20', type: 'Directional Drill', typicalHourlyRate: 90 },
  { make: 'Ditch Witch', model: 'JT30', type: 'Directional Drill', typicalHourlyRate: 100 },

  // ── Vermeer ────────────────────────────────────────────────────
  { make: 'Vermeer', model: 'S925TX', type: 'Mini Skid Steer', typicalHourlyRate: 50 },
  { make: 'Vermeer', model: 'CTX100', type: 'Mini Skid Steer', typicalHourlyRate: 55 },
  { make: 'Vermeer', model: 'RTX250', type: 'Ride-On Trencher', typicalHourlyRate: 55 },
  { make: 'Vermeer', model: 'RT450', type: 'Ride-On Trencher', typicalHourlyRate: 65 },
  { make: 'Vermeer', model: 'SC292', type: 'Stump Cutter', typicalHourlyRate: 55 },
  { make: 'Vermeer', model: 'SC382', type: 'Stump Cutter', typicalHourlyRate: 65 },
  { make: 'Vermeer', model: 'SC60TX', type: 'Stump Cutter', typicalHourlyRate: 75 },
  { make: 'Vermeer', model: 'BC700XL', type: 'Brush Chipper', typicalHourlyRate: 45 },
  { make: 'Vermeer', model: 'BC1000XL', type: 'Brush Chipper', typicalHourlyRate: 55 },
  { make: 'Vermeer', model: 'BC1500', type: 'Brush Chipper', typicalHourlyRate: 70 },
  { make: 'Vermeer', model: 'D20x22 S3', type: 'Directional Drill', typicalHourlyRate: 85 },
  { make: 'Vermeer', model: 'D23x30 S3', type: 'Directional Drill', typicalHourlyRate: 95 },

  // ── Takeuchi ───────────────────────────────────────────────────
  { make: 'Takeuchi', model: 'TB216', type: 'Mini Excavator', typicalHourlyRate: 35 },
  { make: 'Takeuchi', model: 'TB230', type: 'Mini Excavator', typicalHourlyRate: 45 },
  { make: 'Takeuchi', model: 'TB240', type: 'Mini Excavator', typicalHourlyRate: 50 },
  { make: 'Takeuchi', model: 'TB260', type: 'Compact Excavator', typicalHourlyRate: 65 },
  { make: 'Takeuchi', model: 'TB280FR', type: 'Compact Excavator', typicalHourlyRate: 80 },
  { make: 'Takeuchi', model: 'TL6R', type: 'Compact Track Loader', typicalHourlyRate: 75 },
  { make: 'Takeuchi', model: 'TL8', type: 'Compact Track Loader', typicalHourlyRate: 80 },
  { make: 'Takeuchi', model: 'TL10V2', type: 'Compact Track Loader', typicalHourlyRate: 90 },
  { make: 'Takeuchi', model: 'TL12R2', type: 'Compact Track Loader', typicalHourlyRate: 100 },
  { make: 'Takeuchi', model: 'TS80R2', type: 'Skid Steer Loader', typicalHourlyRate: 80 },

  // ── Wacker Neuson ──────────────────────────────────────────────
  { make: 'Wacker Neuson', model: 'BS60-2i', type: 'Rammer/Compactor', typicalHourlyRate: 15 },
  { make: 'Wacker Neuson', model: 'BS70-2i', type: 'Rammer/Compactor', typicalHourlyRate: 18 },
  { make: 'Wacker Neuson', model: 'VP1030A', type: 'Vibratory Plate', typicalHourlyRate: 12 },
  { make: 'Wacker Neuson', model: 'VP1340A', type: 'Vibratory Plate', typicalHourlyRate: 15 },
  { make: 'Wacker Neuson', model: 'VP1550A', type: 'Vibratory Plate', typicalHourlyRate: 18 },
  { make: 'Wacker Neuson', model: 'BPU2540A', type: 'Reversible Plate Compactor', typicalHourlyRate: 20 },
  { make: 'Wacker Neuson', model: 'BPU3750A', type: 'Reversible Plate Compactor', typicalHourlyRate: 25 },
  { make: 'Wacker Neuson', model: 'RD12', type: 'Ride-On Roller', typicalHourlyRate: 40 },
  { make: 'Wacker Neuson', model: 'RD18', type: 'Ride-On Roller', typicalHourlyRate: 50 },
  { make: 'Wacker Neuson', model: 'ET16', type: 'Mini Excavator', typicalHourlyRate: 35 },
  { make: 'Wacker Neuson', model: 'ET20', type: 'Mini Excavator', typicalHourlyRate: 42 },
  { make: 'Wacker Neuson', model: 'ST31', type: 'Skid Steer Loader', typicalHourlyRate: 70 },

  // ── Scag ───────────────────────────────────────────────────────
  { make: 'Scag', model: 'Tiger Cat II', type: 'Zero-Turn Mower', typicalHourlyRate: 42 },
  { make: 'Scag', model: 'Turf Tiger II', type: 'Zero-Turn Mower', typicalHourlyRate: 50 },
  { make: 'Scag', model: 'Cheetah II', type: 'Zero-Turn Mower', typicalHourlyRate: 55 },
  { make: 'Scag', model: 'V-Ride II', type: 'Stand-On Mower', typicalHourlyRate: 38 },
  { make: 'Scag', model: 'Patriot', type: 'Zero-Turn Mower', typicalHourlyRate: 35 },
  { make: 'Scag', model: 'SWZ Hydro-Walk', type: 'Walk-Behind Mower', typicalHourlyRate: 20 },

  // ── Exmark ─────────────────────────────────────────────────────
  { make: 'Exmark', model: 'Lazer Z X-Series', type: 'Zero-Turn Mower', typicalHourlyRate: 50 },
  { make: 'Exmark', model: 'Lazer Z S-Series', type: 'Zero-Turn Mower', typicalHourlyRate: 42 },
  { make: 'Exmark', model: 'Navigator', type: 'Stand-On Mower', typicalHourlyRate: 40 },
  { make: 'Exmark', model: 'Turf Tracer', type: 'Walk-Behind Mower', typicalHourlyRate: 22 },
  { make: 'Exmark', model: 'Staris E-Series', type: 'Stand-On Mower', typicalHourlyRate: 36 },

  // ── Echo ───────────────────────────────────────────────────────
  { make: 'Echo', model: 'CS-590', type: 'Chainsaw', typicalHourlyRate: 7 },
  { make: 'Echo', model: 'CS-7310P', type: 'Chainsaw', typicalHourlyRate: 10 },
  { make: 'Echo', model: 'SRM-2620T', type: 'String Trimmer', typicalHourlyRate: 5 },
  { make: 'Echo', model: 'SRM-3020T', type: 'String Trimmer', typicalHourlyRate: 6 },
  { make: 'Echo', model: 'PB-8010T', type: 'Backpack Blower', typicalHourlyRate: 6 },
  { make: 'Echo', model: 'PB-770T', type: 'Backpack Blower', typicalHourlyRate: 5 },
  { make: 'Echo', model: 'HC-2810', type: 'Hedge Trimmer', typicalHourlyRate: 5 },
  { make: 'Echo', model: 'PPT-2620H', type: 'Pole Pruner', typicalHourlyRate: 6 },
  { make: 'Echo', model: 'BRD-280', type: 'Bed Redefiner', typicalHourlyRate: 8 },

  // ── Honda ──────────────────────────────────────────────────────
  { make: 'Honda', model: 'HRC216K3', type: 'Walk-Behind Mower', typicalHourlyRate: 12 },
  { make: 'Honda', model: 'HRX217VKA', type: 'Walk-Behind Mower', typicalHourlyRate: 10 },
  { make: 'Honda', model: 'WB30X', type: 'Water Pump', typicalHourlyRate: 8 },
  { make: 'Honda', model: 'WT40X', type: 'Trash Pump', typicalHourlyRate: 12 },
  { make: 'Honda', model: 'EU7000iS', type: 'Generator', typicalHourlyRate: 15 },
  { make: 'Honda', model: 'EB5000', type: 'Generator', typicalHourlyRate: 12 },

  // ── Trailers & Support Equipment ───────────────────────────────
  { make: 'Big Tex', model: '70SR 10ft', type: 'Single Axle Trailer', typicalHourlyRate: 10 },
  { make: 'Big Tex', model: '14LP 14ft', type: 'Landscape Trailer', typicalHourlyRate: 15 },
  { make: 'Big Tex', model: '14ET 20ft', type: 'Equipment Trailer', typicalHourlyRate: 20 },
  { make: 'PJ', model: 'T614', type: 'Landscape Trailer', typicalHourlyRate: 12 },
  { make: 'PJ', model: 'T716', type: 'Landscape Trailer', typicalHourlyRate: 15 },
  { make: 'PJ', model: 'DL 14ft', type: 'Dump Trailer', typicalHourlyRate: 25 },
  { make: 'PJ', model: 'DL 16ft', type: 'Dump Trailer', typicalHourlyRate: 30 },
  { make: 'Sure-Trac', model: '6x12 Landscape', type: 'Landscape Trailer', typicalHourlyRate: 12 },
  { make: 'Sure-Trac', model: '7x14 Equipment', type: 'Equipment Trailer', typicalHourlyRate: 18 },

  // ── Pressure Washers ──────────────────────────────────────────
  { make: 'Simpson', model: 'PowerShot 3300', type: 'Pressure Washer', typicalHourlyRate: 10 },
  { make: 'Simpson', model: 'PowerShot 4400', type: 'Pressure Washer', typicalHourlyRate: 14 },
  { make: 'Karcher', model: 'HD 3.0/27', type: 'Pressure Washer', typicalHourlyRate: 10 },
  { make: 'Karcher', model: 'HD 4.0/40', type: 'Pressure Washer', typicalHourlyRate: 15 },
  { make: 'Landa', model: 'PGHW4-35324E', type: 'Hot Water Pressure Washer', typicalHourlyRate: 20 },

  // ── Generators & Compressors ──────────────────────────────────
  { make: 'Generac', model: 'GP3600', type: 'Portable Generator', typicalHourlyRate: 8 },
  { make: 'Generac', model: 'XP8000E', type: 'Portable Generator', typicalHourlyRate: 12 },
  { make: 'Atlas Copco', model: 'XAS 48', type: 'Air Compressor', typicalHourlyRate: 20 },
  { make: 'Sullair', model: '185', type: 'Towable Air Compressor', typicalHourlyRate: 25 },

  // ── Irrigation Equipment ──────────────────────────────────────
  { make: 'Rain Bird', model: '3500', type: 'Rotor Sprinkler Head', typicalHourlyRate: 2 },
  { make: 'Rain Bird', model: 'ESP-TM2', type: 'Irrigation Controller', typicalHourlyRate: 3 },
  { make: 'Hunter', model: 'PGP Ultra', type: 'Rotor Sprinkler Head', typicalHourlyRate: 2 },
  { make: 'Hunter', model: 'Pro-HC', type: 'WiFi Irrigation Controller', typicalHourlyRate: 4 },
  { make: 'Netafim', model: 'Techline CV', type: 'Drip Irrigation', typicalHourlyRate: 3 },

  // ── Concrete / Masonry Equipment ──────────────────────────────
  { make: 'Multiquip', model: 'MC94S', type: 'Concrete Mixer', typicalHourlyRate: 15 },
  { make: 'Multiquip', model: 'Whiteman WM63H', type: 'Mortar Mixer', typicalHourlyRate: 12 },
  { make: 'MK Diamond', model: 'MK-303', type: 'Masonry Saw', typicalHourlyRate: 15 },
  { make: 'MK Diamond', model: 'MK-1600', type: 'Block Saw', typicalHourlyRate: 18 },
  { make: 'Husqvarna', model: 'FS 5000 D', type: 'Floor Saw', typicalHourlyRate: 35 },
  { make: 'Husqvarna', model: 'K 770', type: 'Power Cutter', typicalHourlyRate: 15 },

  // ── Lighting / Landscape Specialty ────────────────────────────
  { make: 'FX Luminaire', model: 'Various', type: 'Landscape Lighting Kit', typicalHourlyRate: 5 },
  { make: 'Unique Lighting', model: 'Various', type: 'Landscape Lighting Kit', typicalHourlyRate: 5 },
  { make: 'Kichler', model: 'Various', type: 'Landscape Lighting Kit', typicalHourlyRate: 5 },

  // ── Trucks ────────────────────────────────────────────────────
  { make: 'Ford', model: 'F-250 Super Duty', type: 'Work Truck', typicalHourlyRate: 25 },
  { make: 'Ford', model: 'F-350 Super Duty', type: 'Work Truck', typicalHourlyRate: 30 },
  { make: 'Ford', model: 'F-550 Dump', type: 'Dump Truck', typicalHourlyRate: 45 },
  { make: 'Chevrolet', model: 'Silverado 2500HD', type: 'Work Truck', typicalHourlyRate: 25 },
  { make: 'Chevrolet', model: 'Silverado 3500HD', type: 'Work Truck', typicalHourlyRate: 30 },
  { make: 'RAM', model: '2500 Tradesman', type: 'Work Truck', typicalHourlyRate: 25 },
  { make: 'RAM', model: '3500 Tradesman', type: 'Work Truck', typicalHourlyRate: 30 },
  { make: 'RAM', model: '5500 Chassis Cab', type: 'Dump Truck', typicalHourlyRate: 45 },
  { make: 'Isuzu', model: 'NPR-HD', type: 'Landscape Truck', typicalHourlyRate: 35 },
  { make: 'Isuzu', model: 'NRR', type: 'Landscape Truck', typicalHourlyRate: 40 },
  { make: 'Hino', model: '195', type: 'Landscape Truck', typicalHourlyRate: 38 },
];

/**
 * Search equipment knowledge base by query string
 * Matches against make, model, and type — ranked by relevance
 */
export function searchEquipment(query: string, limit = 8): EquipmentTemplate[] {
  if (!query || query.length < 1) return [];

  const lowerQuery = query.toLowerCase();
  const tokens = lowerQuery.split(/\s+/).filter(Boolean);

  // Score each entry by how many tokens match and match quality
  const scored = EQUIPMENT_KNOWLEDGE.map(eq => {
    const searchableFields = [
      eq.make.toLowerCase(),
      eq.model.toLowerCase(),
      eq.type.toLowerCase(),
      `${eq.make} ${eq.model}`.toLowerCase(),
    ];

    let score = 0;
    for (const token of tokens) {
      for (const field of searchableFields) {
        if (field === token) score += 10;        // exact match
        else if (field.startsWith(token)) score += 5;  // starts with
        else if (field.includes(token)) score += 2;    // contains
      }
    }

    return { eq, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.eq);
}

/**
 * Get equipment suggestions for autocomplete — alias for searchEquipment with default limit
 */
export function getEquipmentSuggestions(query: string): EquipmentTemplate[] {
  return searchEquipment(query, 8);
}

/**
 * Get a formatted display string for equipment
 * E.g., "Bobcat S650 — Skid Steer Loader ($85/hr)"
 */
export function formatEquipmentDisplay(eq: EquipmentTemplate): string {
  return `${eq.make} ${eq.model} — ${eq.type} ($${eq.typicalHourlyRate}/hr)`;
}

/**
 * Sample data for onboarding "Try with sample data" option
 */
export const SAMPLE_EQUIPMENT: EquipmentTemplate[] = [
  { make: 'Bobcat', model: 'S650', type: 'Skid Steer Loader', typicalHourlyRate: 85 },
  { make: 'Kubota', model: 'KX091-3', type: 'Mini Excavator', typicalHourlyRate: 60 },
  { make: 'Husqvarna', model: 'Z556', type: 'Zero-Turn Mower', typicalHourlyRate: 45 },
];
