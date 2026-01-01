import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatbotService } from '@/services/api'

export interface AgentTransfer {
  id: string
  contact_id: string
  contact_name: string
  phone_number: string
  whatsapp_account: string
  status: 'active' | 'resumed'
  source: 'manual' | 'flow' | 'keyword'
  agent_id?: string
  agent_name?: string
  team_id?: string
  team_name?: string
  transferred_by?: string
  transferred_by_name?: string
  notes?: string
  transferred_at: string
  resumed_at?: string
  resumed_by?: string
  resumed_by_name?: string
}

export const useTransfersStore = defineStore('transfers', () => {
  const transfers = ref<AgentTransfer[]>([])
  const generalQueueCount = ref(0)
  const teamQueueCounts = ref<Record<string, number>>({})
  const isLoading = ref(false)

  // Total queue count (general + all teams)
  const queueCount = computed(() => {
    const teamTotal = Object.values(teamQueueCounts.value).reduce((sum, count) => sum + count, 0)
    return generalQueueCount.value + teamTotal
  })

  const activeTransfers = computed(() =>
    transfers.value.filter(t => t.status === 'active')
  )

  const myTransfers = computed(() => {
    const userId = localStorage.getItem('user_id')
    return transfers.value.filter(t =>
      t.status === 'active' && t.agent_id === userId
    )
  })

  const unassignedCount = computed(() =>
    transfers.value.filter(t => t.status === 'active' && !t.agent_id).length
  )

  // Get active transfer for a specific contact
  function getActiveTransferForContact(contactId: string): AgentTransfer | undefined {
    return transfers.value.find(t => t.contact_id === contactId && t.status === 'active')
  }

  async function fetchTransfers(params?: { status?: string }) {
    isLoading.value = true
    try {
      const response = await chatbotService.listTransfers(params)
      console.log('Transfers API response:', response.data)
      const data = response.data.data || response.data
      console.log('Parsed transfers data:', data)
      transfers.value = data.transfers || []
      generalQueueCount.value = data.general_queue_count ?? 0
      teamQueueCounts.value = data.team_queue_counts ?? {}
      console.log('General queue:', generalQueueCount.value, 'Team queues:', teamQueueCounts.value, 'Transfers:', transfers.value.length)
    } catch (error) {
      console.error('Failed to fetch transfers:', error)
    } finally {
      isLoading.value = false
    }
  }

  function addTransfer(transfer: AgentTransfer) {
    // Add to beginning (newest first for display, but server returns FIFO)
    const exists = transfers.value.some(t => t.id === transfer.id)
    if (!exists) {
      transfers.value.unshift(transfer)
      if (!transfer.agent_id) {
        if (transfer.team_id) {
          teamQueueCounts.value[transfer.team_id] = (teamQueueCounts.value[transfer.team_id] || 0) + 1
        } else {
          generalQueueCount.value++
        }
      }
      console.log('Transfer added to store:', transfer.id, 'Total:', transfers.value.length, 'Queue count:', queueCount.value)
    } else {
      console.log('Transfer already exists:', transfer.id)
    }
  }

  function updateTransfer(id: string, updates: Partial<AgentTransfer>) {
    const index = transfers.value.findIndex(t => t.id === id)
    if (index !== -1) {
      const oldTransfer = transfers.value[index]
      transfers.value[index] = { ...oldTransfer, ...updates }

      // Update queue count if assignment changed
      if (updates.agent_id !== undefined) {
        if (!oldTransfer.agent_id && updates.agent_id) {
          // Was unassigned, now assigned - decrease queue count
          if (oldTransfer.team_id) {
            teamQueueCounts.value[oldTransfer.team_id] = Math.max(0, (teamQueueCounts.value[oldTransfer.team_id] || 0) - 1)
          } else {
            generalQueueCount.value = Math.max(0, generalQueueCount.value - 1)
          }
        } else if (oldTransfer.agent_id && !updates.agent_id) {
          // Was assigned, now unassigned - increase queue count
          const teamId = updates.team_id ?? oldTransfer.team_id
          if (teamId) {
            teamQueueCounts.value[teamId] = (teamQueueCounts.value[teamId] || 0) + 1
          } else {
            generalQueueCount.value++
          }
        }
      }

      // Update queue count if status changed to resumed
      if (updates.status === 'resumed' && oldTransfer.status === 'active' && !oldTransfer.agent_id) {
        if (oldTransfer.team_id) {
          teamQueueCounts.value[oldTransfer.team_id] = Math.max(0, (teamQueueCounts.value[oldTransfer.team_id] || 0) - 1)
        } else {
          generalQueueCount.value = Math.max(0, generalQueueCount.value - 1)
        }
      }
    }
  }

  function removeTransfer(id: string) {
    const index = transfers.value.findIndex(t => t.id === id)
    if (index !== -1) {
      const transfer = transfers.value[index]
      if (transfer.status === 'active' && !transfer.agent_id) {
        if (transfer.team_id) {
          teamQueueCounts.value[transfer.team_id] = Math.max(0, (teamQueueCounts.value[transfer.team_id] || 0) - 1)
        } else {
          generalQueueCount.value = Math.max(0, generalQueueCount.value - 1)
        }
      }
      transfers.value.splice(index, 1)
    }
  }

  return {
    transfers,
    queueCount,
    generalQueueCount,
    teamQueueCounts,
    isLoading,
    activeTransfers,
    myTransfers,
    unassignedCount,
    fetchTransfers,
    addTransfer,
    updateTransfer,
    removeTransfer,
    getActiveTransferForContact
  }
})
