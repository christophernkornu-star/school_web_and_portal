'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { PlusCircle, Search, Trash, Edit, Upload, User, Save, X, Phone, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import { Textarea } from '../../../components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '../../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'

export default function LeadershipManagement() {
  const [activeTab, setActiveTab] = useState('prefects')

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leadership & Community</h1>
        <p className="text-muted-foreground">Manage school leadership, PTA, and School Management Committee members.</p>
      </div>

      <Tabs defaultValue="prefects" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="prefects">Prefects</TabsTrigger>
          <TabsTrigger value="pta">PTA Execs</TabsTrigger>
          <TabsTrigger value="smc">SMC Members</TabsTrigger>
          <TabsTrigger value="staff">Staff Display</TabsTrigger>
        </TabsList>
        
        <TabsContent value="prefects" className="space-y-4 mt-6">
          <LeadershipSection 
            title="School Prefects" 
            tableName="prefects" 
            columns={['name', 'position', 'rank']}
            defaultRank={100}
          />
        </TabsContent>
        
        <TabsContent value="pta" className="space-y-4 mt-6">
          <LeadershipSection 
            title="PTA Executives" 
            tableName="pta_members" 
            columns={['name', 'role', 'contact', 'rank']}
            labelMap={{ role: 'Role / Position' }}
            defaultRank={100}
          />
        </TabsContent>

        <TabsContent value="smc" className="space-y-4 mt-6">
           <LeadershipSection 
            title="School Management Committee" 
            tableName="smc_members" 
            columns={['name', 'role', 'contact', 'rank']}
            labelMap={{ role: 'Role / Position' }}
            defaultRank={100}
          />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4 mt-6">
           <StaffManagementSection />
        </TabsContent>

      </Tabs>
    </div>
  )
}

function LeadershipSection({ title, tableName, columns, labelMap = {}, defaultRank = 100 }: { title: string, tableName: string, columns: string[], labelMap?: Record<string, string>, defaultRank?: number }) {
    const supabase = getSupabaseBrowserClient()
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    
    // Form State
    const [formData, setFormData] = useState<any>({})
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        loadData()
    }, [tableName])

    async function loadData() {
        setLoading(true)
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('rank', { ascending: true })
            .order('created_at', { ascending: false })
            
        if (error) {
            toast.error('Failed to load data')
            console.error(error)
        } else {
            setItems(data || [])
        }
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setUploading(true)

        try {
            const payload: any = { ...formData }
            
            // Handle rank conversion to number if present
            if (payload.rank) payload.rank = parseInt(payload.rank)
            // If contact is empty string, make it null or keep empty
            
            let error
            if (editingItem) {
                const { error: updateError } = await supabase
                    .from(tableName)
                    .update(payload)
                    .eq('id', editingItem.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from(tableName)
                    .insert([payload])
                error = insertError
            }

            if (error) throw error
            
            toast.success(editingItem ? 'Updated successfully' : 'Created successfully')
            setIsDialogOpen(false)
            loadData()
            setFormData({})
            setEditingItem(null)
        } catch (err) {
            toast.error('Operation failed')
            console.error(err)
        } finally {
            setUploading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this item?')) return
        
        const { error } = await supabase.from(tableName).delete().eq('id', id)
        if (error) {
            toast.error('Failed to delete')
        } else {
            toast.success('Deleted successfully')
            loadData() // Reload locally
            // setItems(prev => prev.filter(i => i.id !== id))
        }
    }

    // Image Upload Handler
    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${tableName}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('leadership')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('leadership')
                .getPublicUrl(filePath)

            setFormData((prev: any) => ({ ...prev, image_url: publicUrl }))
            toast.success('Image uploaded')
        } catch (error) {
            toast.error('Error uploading image')
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    const openCreate = () => {
        setEditingItem(null)
        setFormData({ rank: defaultRank })
        setIsDialogOpen(true)
    }

    const openEdit = (item: any) => {
        setEditingItem(item)
        setFormData({ ...item })
        setIsDialogOpen(true)
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>Manage the list of individuals in this group.</CardDescription>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add Member
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />)}
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                        <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No members found. Add one to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {items.map(item => (
                               <div key={item.id} className="flex flex-col border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm group relative">
                                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                        {item.image_url ? (
                                            <Image 
                                                src={item.image_url} 
                                                alt={item.name} 
                                                fill 
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <User className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded-md">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => openEdit(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-white/20 hover:text-red-500" onClick={() => handleDelete(item.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
                                            <Badge variant="outline" className="text-xs">Rank: {item.rank}</Badge>
                                        </div>
                                        <p className="text-sm font-medium text-primary mb-2">
                                            {item.role || item.position}
                                        </p>
                                        {item.contact && (
                                            <div className="mt-auto pt-2 text-sm text-gray-500 flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {item.contact}
                                            </div>
                                        )}
                                    </div>
                               </div>
                           ))}
                       </div>
                    </div>
                )}
            </CardContent>

            <Dialog open={isOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Member' : 'Add New Member'}</DialogTitle>
                        <DialogDescription>
                            Enter the details for this individual.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="picture">Profile Picture</Label>
                            <Input id="picture" type="file" onChange={handleImageUpload} disabled={uploading} accept="image/*" />
                            {formData.image_url && (
                                <div className="mt-2 relative h-20 w-20 rounded-md overflow-hidden border">
                                    <Image src={formData.image_url} alt="Preview" fill className="object-cover" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input 
                                value={formData.name || ''} 
                                onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. John Doe"
                                required 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{labelMap.role || 'Position / Title'}</Label>
                            <Input 
                                value={formData.role || formData.position || ''} 
                                onChange={(e: any) => setFormData({
                                    ...formData, 
                                    [tableName === 'prefects' ? 'position' : 'role']: e.target.value
                                })}
                                placeholder={tableName === 'prefects' ? "e.g. School Prefect" : "e.g. Chairman"}
                                required 
                            />
                        </div>
                        
                        {(tableName === 'pta_members' || tableName === 'smc_members') && (
                             <div className="space-y-2">
                                <Label>Contact Number (Optional)</Label>
                                <Input 
                                    value={formData.contact || ''} 
                                    onChange={(e: any) => setFormData({...formData, contact: e.target.value})}
                                    placeholder="e.g. 0244123456"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Display Rank (Order)</Label>
                            <Input 
                                type="number"
                                value={formData.rank || ''} 
                                onChange={(e: any) => setFormData({...formData, rank: e.target.value})}
                                placeholder="1"
                            />
                            <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

function StaffManagementSection() {
    const supabase = getSupabaseBrowserClient()
    const [teachers, setTeachers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [formData, setFormData] = useState<any>({})
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        loadTeachers()
    }, [])

    async function loadTeachers() {
        setLoading(true)
        const { data } = await supabase
            .from('teachers')
            .select(`
                *,
                profiles:profile_id (
                    email,
                    username
                )
            `)
            .order('last_name')
        setTeachers(data || [])
        setLoading(false)
    }

    const filteredTeachers = teachers.filter(t => 
        t.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.last_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault()
        setUploading(true)
        
        try {
            const { error } = await supabase
                .from('teachers')
                .update({ 
                    position: formData.position,
                    display_rank: parseInt(formData.display_rank),
                    bio: formData.bio,
                    title: formData.title,
                    image_url: formData.image_url
                })
                .eq('id', selectedTeacher!.id)

            if (error) throw error
            toast.success('Staff updated')
            setIsOpen(false)
            loadTeachers()
        } catch (err) {
            toast.error('Failed to update')
            console.error(err)
        } finally {
            setUploading(false)
        }
    }

    async function handleStaffImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
         const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `staff/${selectedTeacher!.id}-${Math.random()}.${fileExt}`
            
            const { error: uploadError } = await supabase.storage
                .from('leadership')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('leadership')
                .getPublicUrl(fileName)

            setFormData((prev: any) => ({ ...prev, image_url: publicUrl }))
            toast.success('Image uploaded')
        } catch (error) {
            toast.error('Error uploading image')
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    const openEdit = (teacher: any) => {
        setSelectedTeacher(teacher)
        setFormData({
            position: teacher.position || '',
            display_rank: teacher.display_rank || 100,
            bio: teacher.bio || '',
            title: teacher.title || (teacher.gender === 'Female' ? 'Mrs.' : 'Mr.'),
            image_url: teacher.image_url
        })
        setIsOpen(true)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Teaching Staff Enhancement</CardTitle>
                <CardDescription>
                    Select existing teachers to add public-facing details like photos, bios, and specific titles. 
                    These details will appear on the "Leadership / Staff" page.
                </CardDescription>
                <div className="pt-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search teachers by name..."
                            className="pl-8 w-full md:w-[300px]"
                            value={searchTerm}
                            onChange={(e: any) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-md border">
                            <div className="grid grid-cols-12 gap-4 p-4 font-medium bg-muted/50 text-sm">
                                <div className="col-span-4">Name</div>
                                <div className="col-span-3">Current Role</div>
                                <div className="col-span-3">Public Position</div>
                                <div className="col-span-2 text-right">Action</div>
                            </div>
                            <div className="divide-y max-h-[600px] overflow-y-auto">
                                {filteredTeachers.map(teacher => (
                                    <div key={teacher.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-muted/30 transition-colors">
                                        <div className="col-span-4 font-medium flex items-center gap-3">
                                            {teacher.image_url ? (
                                                <div className="h-8 w-8 rounded-full overflow-hidden relative">
                                                    <Image src={teacher.image_url} alt="" fill className="object-cover" />
                                                </div>
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                </div>
                                            )}
                                            {teacher.first_name} {teacher.last_name}
                                        </div>
                                        <div className="col-span-3 text-muted-foreground truncate">
                                            {teacher.specialization || 'General'}
                                        </div>
                                        <div className="col-span-3">
                                            {teacher.position ? (
                                                <Badge variant="secondary" className="font-normal">
                                                    {teacher.position}
                                                </Badge>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Not set</span>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(teacher)}>
                                                Edit Profile
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

             <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Public Profile</DialogTitle>
                        <DialogDescription>
                            Update {selectedTeacher?.first_name}'s public website details.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdate} className="space-y-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="staff-picture">Profile Picture</Label>
                            <Input id="staff-picture" type="file" onChange={handleStaffImageUpload} disabled={uploading} accept="image/*" />
                            {formData.image_url && (
                                <div className="mt-2 relative h-20 w-20 rounded-md overflow-hidden border">
                                    <Image src={formData.image_url} alt="Preview" fill className="object-cover" />
                                </div>
                            )}
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Select 
                                    value={formData.title} 
                                    onValueChange={(v: any) => setFormData({...formData, title: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Title" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Mr.">Mr.</SelectItem>
                                        <SelectItem value="Mrs.">Mrs.</SelectItem>
                                        <SelectItem value="Ms.">Ms.</SelectItem>
                                        <SelectItem value="Dr.">Dr.</SelectItem>
                                        <SelectItem value="Rev.">Rev.</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Display Order</Label>
                                <Input 
                                    type="number" 
                                    value={formData.display_rank}
                                    onChange={(e: any) => setFormData({...formData, display_rank: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Public Position / Role</Label>
                            <Input 
                                value={formData.position}
                                onChange={(e: any) => setFormData({...formData, position: e.target.value})}
                                placeholder="e.g. Headmaster, Senior Housemaster"
                            />
                            <p className="text-xs text-muted-foreground">Leave blank to just show as 'Teacher' on the site.</p>
                        </div>
                        
                         <div className="space-y-2">
                            <Label>Brief Bio (Optional)</Label>
                            <Textarea 
                                value={formData.bio}
                                onChange={(e: any) => setFormData({...formData, bio: e.target.value})}
                                placeholder="A short description about the teacher..."
                                rows={3}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? 'Saving...' : 'Save Public Profile'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    )

}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-muted rounded-md ${className}`} />
}
