<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { chatbotService } from '@/services/api'
import { toast } from 'vue-sonner'
import { Plus, Pencil, Trash2, Workflow, ArrowLeft, Play, Pause } from 'lucide-vue-next'

interface ChatbotFlow {
  id: string
  name: string
  description: string
  trigger_keywords: string[]
  steps_count: number
  enabled: boolean
  created_at: string
}

const router = useRouter()
const flows = ref<ChatbotFlow[]>([])
const isLoading = ref(true)
const deleteDialogOpen = ref(false)
const flowToDelete = ref<ChatbotFlow | null>(null)

onMounted(async () => {
  await fetchFlows()
})

async function fetchFlows() {
  isLoading.value = true
  try {
    const response = await chatbotService.listFlows()
    const data = response.data.data || response.data
    flows.value = data.flows || []
  } catch (error) {
    console.error('Failed to load flows:', error)
    flows.value = []
  } finally {
    isLoading.value = false
  }
}

function createFlow() {
  router.push('/chatbot/flows/new')
}

function editFlow(flow: ChatbotFlow) {
  router.push(`/chatbot/flows/${flow.id}/edit`)
}

async function toggleFlow(flow: ChatbotFlow) {
  try {
    await chatbotService.updateFlow(flow.id, { enabled: !flow.enabled })
    flow.enabled = !flow.enabled
    toast.success(flow.enabled ? 'Flow enabled' : 'Flow disabled')
  } catch (error) {
    toast.error('Failed to toggle flow')
  }
}

function openDeleteDialog(flow: ChatbotFlow) {
  flowToDelete.value = flow
  deleteDialogOpen.value = true
}

async function confirmDeleteFlow() {
  if (!flowToDelete.value) return

  try {
    await chatbotService.deleteFlow(flowToDelete.value.id)
    toast.success('Flow deleted')
    deleteDialogOpen.value = false
    flowToDelete.value = null
    await fetchFlows()
  } catch (error) {
    toast.error('Failed to delete flow')
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <header class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="flex h-16 items-center px-6">
        <RouterLink to="/chatbot">
          <Button variant="ghost" size="icon" class="mr-3">
            <ArrowLeft class="h-5 w-5" />
          </Button>
        </RouterLink>
        <Workflow class="h-5 w-5 mr-3" />
        <div class="flex-1">
          <h1 class="text-xl font-semibold">Conversation Flows</h1>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/chatbot">Chatbot</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Flows</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <Button variant="outline" size="sm" @click="createFlow">
          <Plus class="h-4 w-4 mr-2" />
          Create Flow
        </Button>
      </div>
    </header>

    <!-- Flows List -->
    <ScrollArea class="flex-1">
      <div class="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <!-- Loading Skeleton -->
        <template v-if="isLoading">
          <Card v-for="i in 6" :key="i" class="flex flex-col">
            <CardHeader>
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <Skeleton class="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton class="h-5 w-32 mb-2" />
                    <Skeleton class="h-5 w-16" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent class="flex-1">
              <Skeleton class="h-4 w-full mb-3" />
              <div class="flex gap-1 mb-3">
                <Skeleton class="h-5 w-14" />
                <Skeleton class="h-5 w-16" />
              </div>
              <Skeleton class="h-4 w-20" />
            </CardContent>
            <div class="p-4 pt-0 flex items-center justify-between border-t mt-auto">
              <div class="flex gap-2">
                <Skeleton class="h-8 w-8 rounded" />
                <Skeleton class="h-8 w-8 rounded" />
              </div>
              <Skeleton class="h-8 w-20" />
            </div>
          </Card>
        </template>

        <template v-else>
          <Card v-for="flow in flows" :key="flow.id" class="flex flex-col">
            <CardHeader>
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Workflow class="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle class="text-base">{{ flow.name }}</CardTitle>
                    <Badge
                      variant="outline"
                      :class="flow.enabled ? 'border-green-600 text-green-600 mt-1' : 'mt-1'"
                    >
                      {{ flow.enabled ? 'Active' : 'Inactive' }}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent class="flex-1">
              <p class="text-sm text-muted-foreground mb-3">{{ flow.description || 'No description' }}</p>
              <div class="flex flex-wrap gap-1 mb-3" v-if="flow.trigger_keywords?.length">
                <Badge v-for="keyword in flow.trigger_keywords" :key="keyword" variant="outline">
                  {{ keyword }}
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground">{{ flow.steps_count }} steps</p>
            </CardContent>
            <div class="p-4 pt-0 flex items-center justify-between border-t mt-auto">
              <div class="flex gap-2">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button variant="ghost" size="icon" @click="editFlow(flow)">
                      <Pencil class="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit flow</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button variant="ghost" size="icon" @click="openDeleteDialog(flow)">
                      <Trash2 class="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete flow</TooltipContent>
                </Tooltip>
              </div>
              <Button
                :variant="flow.enabled ? 'outline' : 'default'"
                size="sm"
                @click="toggleFlow(flow)"
              >
                <component :is="flow.enabled ? Pause : Play" class="h-4 w-4 mr-1" />
                {{ flow.enabled ? 'Disable' : 'Enable' }}
              </Button>
            </div>
          </Card>

          <Card v-if="flows.length === 0" class="col-span-full">
            <CardContent class="py-12 text-center text-muted-foreground">
              <Workflow class="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p class="text-lg font-medium">No conversation flows yet</p>
              <p class="text-sm mb-4">Create your first flow to automate conversations.</p>
              <Button variant="outline" size="sm" @click="createFlow">
                <Plus class="h-4 w-4 mr-2" />
                Create Flow
              </Button>
            </CardContent>
          </Card>
        </template>
      </div>
    </ScrollArea>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Flow</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{{ flowToDelete?.name }}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteFlow">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
