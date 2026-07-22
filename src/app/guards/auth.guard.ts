import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export const authGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): boolean | UrlTree | Observable<boolean | UrlTree> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notifier = inject(NotificationService);

    // 1) Pas de token -> rediriger vers login (avec returnUrl)
    if (!authService.getToken()) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    // 2) Si user déjà connu -> check rôles synchrones
    const currentUser = authService.currentUserValue;
    if (currentUser) {
        const requiredRoles = route.data?.['roles'] as string[] | undefined;
        if (requiredRoles && requiredRoles.length > 0) {
            const ok = requiredRoles.includes(currentUser.role);
            if (!ok) {
                // Affiche popup
                notifier.show("Vous n'avez pas l'accès à cette page.");

                // Tenter de récupérer l'URL précédente (si disponible) pour y revenir proprement.
                // router.getCurrentNavigation() est disponible pendant la navigation courante.
                const prev = router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString();
                const fallback = prev || '/home';

                // Retourner une UrlTree vers la page précédente pour éviter "page vide".
                return router.createUrlTree([fallback]);
            }
        }
        return true;
    }

    // 3) Token présent mais user non initialisé -> vérifie côté serveur (async)
    return authService.verifyToken().pipe(
        map(user => {
            if (!user) {
                return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
            }

            const requiredRoles = route.data?.['roles'] as string[] | undefined;
            if (requiredRoles && requiredRoles.length > 0) {
                const ok = requiredRoles.includes(user.role);
                if (!ok) {
                    notifier.show("Vous n'avez pas l'accès à cette page.");

                    const prev = router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString();
                    const fallback = prev || '/home';
                    return router.createUrlTree([fallback]);
                }
            }

            return true;
        }),
        catchError(() => of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })))
    );
};
