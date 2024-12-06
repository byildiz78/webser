'use client';

import { useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function SwaggerPage() {
  return (
    <div className="container mx-auto p-4">
      <SwaggerUI 
        url="/swagger.json" 
        requestInterceptor={(req) => {
          if (req.headers.Authorization) {
            // Bearer token zaten ekli, bir şey yapmaya gerek yok
            return req;
          }
          return req;
        }}
      />
    </div>
  );
}
