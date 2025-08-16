'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Users, Hash } from 'lucide-react'
import {useAuthStore} from '@/store/authStore'

export default function RightSidebar() {
  const { user } = useAuthStore()
  const [suggestions, setSuggestions] = useState([])
  const [trending, setTrending] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSuggestions()
    loadTrending()
  }, [])

  const loadSuggestions = async () => {
    try {
      // Mock suggestions for now - replace with real API call
      const mockSuggestions = [
        {
          id: 1,
          username: 'john_doe',
          profilePicture: null,
          followersCount: 1234,
          isFollowing: false
        },
        {
          id: 2,
          username: 'jane_smith',
          profilePicture: null,
          followersCount: 5678,
          isFollowing: false
        },
        {
          id: 3,
          username: 'photographer_pro',
          profilePicture: null,
          followersCount: 9876,
          isFollowing: false
        }
      ]
      
      setTimeout(() => {
        setSuggestions(mockSuggestions)
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
      setIsLoading(false)
    }
  }

  const loadTrending = async () => {
    try {
      // Mock trending data - replace with real API call
      const mockTrending = [
        { id: 1, tag: 'photography', postsCount: 12345 },
        { id: 2, tag: 'travel', postsCount: 9876 },
        { id: 3, tag: 'food', postsCount: 8765 },
        { id: 4, tag: 'nature', postsCount: 7654 },
        { id: 5, tag: 'fitness', postsCount: 6543 }
      ]
      
      setTimeout(() => {
        setTrending(mockTrending)
      }, 1200)
    } catch (error) {
      console.error('Failed to load trending:', error)
    }
  }

  const handleFollowToggle = async (userId, currentlyFollowing) => {
    try {
      // Mock follow/unfollow - replace with real API call
      setSuggestions(prev => prev.map(suggestion => 
        suggestion.id === userId 
          ? { ...suggestion, isFollowing: !currentlyFollowing }
          : suggestion
      ))
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* User Profile Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user?.profilePicture} alt={user?.username} />
              <AvatarFallback className="bg-gray-700 text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-white">{user?.username}</p>
              <p className="text-sm text-gray-400">@{user?.username}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Suggestions for you
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full bg-gray-700" />
                    <div className="space-y-1">
                      <Skeleton className="w-24 h-4 bg-gray-700" />
                      <Skeleton className="w-16 h-3 bg-gray-700" />
                    </div>
                  </div>
                  <Skeleton className="w-16 h-8 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="flex items-center justify-between p-4 hover:bg-gray-800 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={suggestion.profilePicture} />
                      <AvatarFallback className="bg-gray-700 text-white text-sm">
                        {suggestion.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link 
                        href={`/profile/${suggestion.username}`}
                        className="font-medium text-white hover:text-gray-300 text-sm"
                      >
                        {suggestion.username}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {suggestion.followersCount.toLocaleString()} followers
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={suggestion.isFollowing ? "outline" : "default"}
                    className={
                      suggestion.isFollowing 
                        ? "border-gray-600 text-gray-300 hover:bg-gray-800" 
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }
                    onClick={() => handleFollowToggle(suggestion.id, suggestion.isFollowing)}
                  >
                    {suggestion.isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              ))}
              <div className="p-4 border-t border-gray-800">
                <Link 
                  href="/discover/people" 
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  See all suggestions
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trending */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {trending.map((tag, index) => (
              <Link
                key={tag.id}
                href={`/explore/tags/${tag.tag}`}
                className="flex items-center justify-between p-4 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-lg">
                    <Hash className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">#{tag.tag}</p>
                    <p className="text-xs text-gray-400">
                      {tag.postsCount.toLocaleString()} posts
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="text-xs text-gray-500 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Link href="/about" className="hover:text-gray-400">About</Link>
          <span>•</span>
          <Link href="/help" className="hover:text-gray-400">Help</Link>
          <span>•</span>
          <Link href="/press" className="hover:text-gray-400">Press</Link>
          <span>•</span>
          <Link href="/api" className="hover:text-gray-400">API</Link>
          <span>•</span>
          <Link href="/jobs" className="hover:text-gray-400">Jobs</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-gray-400">Terms</Link>
          <span>•</span>
          <Link href="/locations" className="hover:text-gray-400">Locations</Link>
        </div>
        <p className="text-gray-600">© 2024 Instagram Clone</p>
      </div>
    </div>
  )
}