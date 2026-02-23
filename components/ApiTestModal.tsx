
'use client'

import { useState } from 'react'

interface ApiTestModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (testData: any) => Promise<void>
}

export function ApiTestModal({ isOpen, onClose, onSave }: ApiTestModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        method: 'GET',
        url: '',
        headers: '',
        body: '',
        expectedStatus: '200'
    })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            // Convert headers string to object/array if needed, but for now we'll store as is or in a structured step
            // For API tests, we'll create a step that represents the API call
            // The backend expects the first step to be a JSON string of an ARRAY of steps
            const structuredSteps = [{
                id: '1',
                type: 'api_call',
                method: formData.method,
                url: formData.url,
                headers: formData.headers,
                body: formData.body,
                expectedStatus: formData.expectedStatus
            }]

            const steps = [JSON.stringify(structuredSteps)]

            await onSave({
                name: formData.name,
                description: formData.description,
                steps, // This will be parsed by backend/generator
                expectedResult: `Status code should be ${formData.expectedStatus}`,
                framework: 'jest', // Default frameork for API
                language: 'typescript',
                type: 'API' // Explicitly set type to API
            })
            onClose()
        } catch (error) {
            console.error('Failed to save API test:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Create API Test</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Test Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Method</label>
                            <select
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.method}
                                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                            >
                                <option>GET</option>
                                <option>POST</option>
                                <option>PUT</option>
                                <option>DELETE</option>
                                <option>PATCH</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700">URL</label>
                            <input
                                type="url"
                                required
                                placeholder="https://api.example.com/users"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Headers (JSON format)</label>
                        <textarea
                            placeholder='{"Authorization": "Bearer token"}'
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                            rows={3}
                            value={formData.headers}
                            onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Body (JSON)</label>
                        <textarea
                            placeholder='{"name": "John Doe"}'
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                            rows={5}
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expected Status Code</label>
                        <input
                            type="number"
                            required
                            className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2"
                            value={formData.expectedStatus}
                            onChange={(e) => setFormData({ ...formData, expectedStatus: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Create API Test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
