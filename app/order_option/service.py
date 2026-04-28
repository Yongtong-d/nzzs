from sqlalchemy.orm import Session

from app.order_option.model import OrderOption

PET_TYPE = 'pet_type'
SERVICE_TYPE = 'service_type'
DEFAULT_PET_TYPES = ['猫', '狗', '其他']
DEFAULT_SERVICE_TYPES = ['上门喂养', '遛狗', '上门照看']


class OrderOptionService:
    @staticmethod
    def _normalize_values(values: list[str], fallback: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()

        for raw in values:
            value = raw.strip()
            if not value or value in seen:
                continue
            normalized.append(value[:50])
            seen.add(value)

        if normalized:
            return normalized
        return fallback.copy()

    def _replace_values(self, db: Session, option_type: str, values: list[str]) -> None:
        db.query(OrderOption).filter(OrderOption.option_type == option_type).delete(synchronize_session=False)
        for index, value in enumerate(values):
            db.add(
                OrderOption(
                    option_type=option_type,
                    option_value=value,
                    sort_order=index,
                    is_enabled=True,
                )
            )

    def get_options(self, db: Session) -> dict[str, list[str]]:
        options = (
            db.query(OrderOption)
            .filter(OrderOption.is_enabled.is_(True))
            .order_by(OrderOption.option_type.asc(), OrderOption.sort_order.asc(), OrderOption.id.asc())
            .all()
        )

        pet_types = [item.option_value for item in options if item.option_type == PET_TYPE]
        service_types = [item.option_value for item in options if item.option_type == SERVICE_TYPE]

        return {
            'pet_types': self._normalize_values(pet_types, DEFAULT_PET_TYPES),
            'service_types': self._normalize_values(service_types, DEFAULT_SERVICE_TYPES),
        }

    def update_options(self, db: Session, pet_types: list[str], service_types: list[str]) -> dict[str, list[str]]:
        normalized_pet_types = self._normalize_values(pet_types, DEFAULT_PET_TYPES)
        normalized_service_types = self._normalize_values(service_types, DEFAULT_SERVICE_TYPES)

        self._replace_values(db, PET_TYPE, normalized_pet_types)
        self._replace_values(db, SERVICE_TYPE, normalized_service_types)
        db.commit()

        return {
            'pet_types': normalized_pet_types,
            'service_types': normalized_service_types,
        }

    def ensure_defaults(self, db: Session) -> None:
        has_pet = db.query(OrderOption.id).filter(OrderOption.option_type == PET_TYPE).first() is not None
        has_service = db.query(OrderOption.id).filter(OrderOption.option_type == SERVICE_TYPE).first() is not None

        if has_pet and has_service:
            return

        if not has_pet:
            self._replace_values(db, PET_TYPE, DEFAULT_PET_TYPES)
        if not has_service:
            self._replace_values(db, SERVICE_TYPE, DEFAULT_SERVICE_TYPES)
        db.commit()


order_option_service = OrderOptionService()
