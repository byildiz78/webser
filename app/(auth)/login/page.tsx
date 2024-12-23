"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const onSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Add your actual API logic here
        } catch (err) {
            setError("Authentication failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-gray-900 to-black">
            <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:px-0">
                <div className="lg:p-8 relative z-10">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                            RobotPOS RealTime API
                        </h1>
                        <p className="text-xl text-gray-300">
                            Güvenli giriş ile tüm API özelliklerine erişin
                        </p>
                    </div>

                    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">


                        <Card className="bg-gray-800/30 backdrop-blur-lg border border-gray-700/50 shadow-lg">
                            <CardContent className="pt-6">
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email" className="text-gray-200">Email</Label>
                                        <Input
                                            id="email"
                                            placeholder="name@example.com"
                                            type="email"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            autoCorrect="off"
                                            disabled={isLoading}
                                            className="bg-gray-900/50 border-gray-700 text-gray-200"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password" className="text-gray-200">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            autoCapitalize="none"
                                            autoComplete="current-password"
                                            disabled={isLoading}
                                            className="bg-gray-900/50 border-gray-700 text-gray-200"
                                        />
                                    </div>

                                    {error && (
                                        <div className="text-sm text-red-400">
                                            {error}
                                        </div>
                                    )}

                                    <Button
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                        disabled={isLoading}
                                        onClick={onSubmit}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center space-x-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                <span>Giriş yapılıyor...</span>
                                            </div>
                                        ) : (
                                            "Giriş Yap"
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}