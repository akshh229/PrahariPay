from typing import List, Optional

from pydantic import BaseModel


class Wallet(BaseModel):
    user_id: str
    public_key: Optional[str] = None
    balance: float
    offline_credit_limit: float
    guardian_list: List[str] = []  # List of Guardian IDs
    trust_score: float


class BalanceUpdate(BaseModel):
    amount: float
    operation: str = "set"  # set | add | subtract


class CreditLimitUpdate(BaseModel):
    offline_credit_limit: float
