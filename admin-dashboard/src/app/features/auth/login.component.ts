import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { Auth0Service } from '../../core/auth/sso-auth.service';
import LoginButtonComponent from './login-button.component';

@Component({
    selector: 'app-login',
    imports: [CommonModule, LoginButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <!-- Left Panel - Branding -->
            <div class="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
                <!-- Background Pattern -->
                <div class="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-purple-700"></div>
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.05)_0%,transparent_50%)]"></div>
                
                <!-- Content -->
                <div class="relative z-10 flex flex-col justify-center px-16 py-12 text-white">
                    <!-- Logo -->
                    <div class="flex items-center gap-4 mb-12">
                        <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                            <span class="material-symbols-outlined text-3xl text-white">local_shipping</span>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold">Loomis Courier</h1>
                            <p class="text-white/80 text-sm font-medium">Admin Platform</p>
                        </div>
                    </div>
                    
                    <!-- Hero Content -->
                    <div class="max-w-lg">
                        <h2 class="text-4xl font-bold leading-tight mb-6">
                            AI-Automated Courier Service Platform
                        </h2>
                        <p class="text-xl text-white/90 mb-8 leading-relaxed">
                            Experience a fully AI-automated courier service that streamlines customer service and internal operations. Our platform manages shipments, automates customer inquiries, and optimizes every aspect of your courier business with intelligent automation.
                        </p>
                        <!-- Features -->
                        <div class="space-y-4">
                            <div class="flex items-center gap-3">
                                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                                    <span class="material-symbols-outlined text-sm">smart_toy</span>
                                </div>
                                <span class="text-white/90">AI-automated customer service</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                                    <span class="material-symbols-outlined text-sm">settings</span>
                                </div>
                                <span class="text-white/90">Automated internal operations</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                                    <span class="material-symbols-outlined text-sm">local_shipping</span>
                                </div>
                                <span class="text-white/90">End-to-end shipment automation</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Floating Elements -->
                <div class="absolute top-1/4 right-16 h-32 w-32 rounded-full bg-white/10 backdrop-blur animate-float"></div>
                <div class="absolute bottom-1/4 right-32 h-20 w-20 rounded-full bg-white/5 backdrop-blur animate-float-delayed"></div>
            </div>
            
            <!-- Right Panel - Login Form -->
            <div class="flex w-full lg:w-1/2 xl:w-2/5 items-center justify-center p-8 lg:p-16">
                @if (auth0.isLoading$ | async) {
                    <!-- Loading State -->
                    <div class="w-full max-w-md text-center">
                        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 animate-pulse mb-6">
                            <span class="material-symbols-outlined text-2xl text-primary animate-spin">refresh</span>
                        </div>
                        <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                            Initializing secure connection...
                        </h3>
                        <p class="text-slate-500 dark:text-slate-400 mt-2">Please wait while we prepare your login</p>
                    </div>
                } @else {
                    <!-- Login Form -->
                    <div class="w-full max-w-md space-y-8">
                        <!-- Centered Sign In Title -->
                        <div class="flex flex-col items-center justify-center mb-8">
                            <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center">
                                Sign in to Admin Dashboard
                            </h2>
                        </div>
                        
                        <!-- Error State -->
                        @if (auth0.error$ | async; as error) {
                            <div class="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
                                <div class="flex">
                                    <span class="material-symbols-outlined text-red-500 mr-3">error</span>
                                    <div>
                                        <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                                            Authentication Failed
                                        </h3>
                                        <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                                            {{ error.message }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                        
                        <!-- Login Card (No Security Badge, No Alt Auth) -->
                        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center">
                            <div class="space-y-4 w-full">
                                <app-login-button />
                                <!-- Additional Info -->
                                <div class="text-center pt-4">
                                    <p class="text-xs text-slate-500 dark:text-slate-400">
                                        By signing in, you agree to our Terms of Service and Privacy Policy
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="text-center text-sm text-slate-500 dark:text-slate-400">
                            Need help? Contact support at 
                            <a href="mailto:support@loomiscourier.com" class="text-primary hover:underline font-medium">
                                support@loomiscourier.com
                            </a>
                        </div>
                    </div>
                }
            </div>
        </div>
        
        <!-- Custom Animations -->
        <style>
            @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(3deg); }
            }
            @keyframes float-delayed {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-15px) rotate(-2deg); }
            }
            .animate-float {
                animation: float 6s ease-in-out infinite;
            }
            .animate-float-delayed {
                animation: float-delayed 8s ease-in-out infinite 2s;
            }
        </style>
    `
})
export default class LoginComponent {
    protected auth0 = inject(AuthService);
    private auth0Service = inject(Auth0Service);
}