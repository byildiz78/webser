import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    const key = Cookies.get('api_key');
    setApiKey(key);
  }, []);

  const setKey = (key: string) => {
    Cookies.set('api_key', key);
    setApiKey(key);
  };

  const removeKey = () => {
    Cookies.remove('api_key');
    setApiKey(undefined);
  };

  return { apiKey, setKey, removeKey };
}
