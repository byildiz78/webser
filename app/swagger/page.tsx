'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function SwaggerPage() {
  return (
    <div className="container mx-auto p-4">
      <SwaggerUI 
        url="/api/docs" 
        requestInterceptor={(req) => {
          if (req.headers.Authorization) {
            return req;
          }
          return req;
        }}
      />
    </div>
  );
}
