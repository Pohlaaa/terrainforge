export interface Project {
  id: string
  name: string
  location: string
  status: 'planning' | 'active' | 'completed' | 'on-hold'
  description: string
  startDate: string
  endDate?: string
  budget: number
  spent: number
  squareFootage: number
  createdAt: string
  updatedAt: string
}

export interface Material {
  id: string
  name: string
  category: string
  description: string
  unitPrice: number
  unit: 'cubic yard' | 'ton' | 'bundle' | 'each' | 'square foot' | 'linear foot'
  supplier: string
  supplierContact: string
  inStock: number
  reorderLevel: number
  createdAt: string
  updatedAt: string
}

export interface CrewMember {
  id: string
  name: string
  role: string
  email: string
  phone: string
  status: 'active' | 'inactive' | 'on-leave'
  hireDate: string
  hourlyRate: number
  certifications: string[]
  createdAt: string
  updatedAt: string
}

export interface Equipment {
  id: string
  name: string
  type: string
  serialNumber: string
  purchaseDate: string
  purchasePrice: number
  currentValue: number
  status: 'available' | 'in-use' | 'maintenance' | 'retired'
  assignedTo?: string
  maintenanceSchedule: string
  lastMaintenance?: string
  createdAt: string
  updatedAt: string
}

export interface WorkOrder {
  id: string
  projectId: string
  title: string
  description: string
  status: 'draft' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  assignedTo: string[]
  materialsNeeded: Array<{
    materialId: string
    quantity: number
    unit: string
  }>
  estimatedHours: number
  actualHours?: number
  createdAt: string
  updatedAt: string
}

export interface Manifest {
  id: string
  projectId: string
  generatedAt: string
  materials: Array<{
    materialId: string
    name: string
    quantity: number
    unit: string
    costPerUnit: number
    totalCost: number
  }>
  laborHours: number
  estimatedLaborCost: number
  totalEstimatedCost: number
}

export interface PriceQuote {
  id: string
  materialId: string
  supplier: string
  pricePerUnit: number
  unit: string
  quantity: number
  totalPrice: number
  quotedDate: string
  expiryDate: string
  notes: string
}

export interface User {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'manager' | 'crew-member'
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}
