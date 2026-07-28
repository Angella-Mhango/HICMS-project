from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token


def api_root(request):
    return JsonResponse({
        "message": "HICMS backend is running",
        "routes": {
            "login": "/api-token-auth/",
            "admin": "/admin/",
            "standards": "/api/standards/",
            "facilities": "/facilities/",
            "inspections": "/inspections/",
            "accounts": "/accounts/",
            "hierarchy": "/hierarchy/",
        },
    })


urlpatterns = [
    path('', api_root, name='api-root'),
    path('api-token-auth/', obtain_auth_token, name='api-token-auth'),
    path('admin/', admin.site.urls),
    path('api/standards/', include('standards.urls')),
    path('facilities/', include('facilities.urls')),
    path('inspections/', include('inspections.urls')),
    path('accounts/', include('accounts.urls')),
    path('hierarchy/', include('hierarchy.urls')),
]
