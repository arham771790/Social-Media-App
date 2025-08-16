'use client';
import { useParams } from 'next/navigation';
import UserProfile from '@/components/profile/UserProfile';

export default function UserByIdPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!id) return null;
  return <UserProfile userId={id} />;
}
