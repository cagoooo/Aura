"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn, LogOut, BookMarked, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onOpenLibrary: () => void;
}

export default function AuthMenu({ onOpenLibrary }: Props) {
  const { user, loading, configured, signIn, signOut } = useAuth();
  const { toast } = useToast();

  if (!configured) return null;
  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          const u = await signIn();
          if (u) toast({ variant: "success", title: "登入成功", description: `歡迎 ${u.displayName ?? u.email ?? '使用者'}！` });
          else toast({ variant: "destructive", title: "登入失敗", description: "請再試一次或檢查瀏覽器彈窗權限。" });
        }}
        aria-label="使用 Google 登入"
        className="text-muted-foreground hover:text-primary"
      >
        <LogIn className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">登入</span>
      </Button>
    );
  }

  const initials = (user.displayName ?? user.email ?? '?').slice(0, 1).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="使用者選單" className="px-1.5 hover:bg-accent/30">
          <Avatar className="h-7 w-7">
            {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName ?? ''} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="flex flex-col items-start gap-0.5">
          <span className="text-sm font-semibold">{user.displayName ?? '使用者'}</span>
          <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenLibrary}>
          <BookMarked className="mr-2 h-4 w-4" />
          我的故事庫
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => {
          await signOut();
          toast({ title: "已登出" });
        }}>
          <LogOut className="mr-2 h-4 w-4" />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
