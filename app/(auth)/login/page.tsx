"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const onSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await axios.post("/api/auth/login", {
                username,
                password
            });
            
            if (response.data) {
                router.push("/");
            }
        } catch (err) {
            if(err.response.status === 401) {
                setError("Kullanıcı adı veya sifre yanlıs.");
            }else{
                setError("Giriş Yapılırken Bir Hata Olustu.");
            }
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
                                <form onSubmit={onSubmit} className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="username" className="text-gray-200">Username</Label>
                                        <Input
                                            id="username"
                                            placeholder="Enter your username"
                                            type="text"
                                            autoCapitalize="none"
                                            autoComplete="username"
                                            autoCorrect="off"
                                            disabled={isLoading}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="bg-gray-900/50 border-gray-700 text-gray-200"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password" className="text-gray-200">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Enter your password"
                                            autoCapitalize="none"
                                            autoComplete="current-password"
                                            disabled={isLoading}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="bg-gray-900/50 border-gray-700 text-gray-200"
                                        />
                                    </div>

                                    {error && (
                                        <div className="text-sm text-red-400">
                                            {error}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                        disabled={isLoading}
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
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}